/**
 * STRUCTIFY: Processes input data against a schema and normalizes the result.
 * Converts natural language input into structured data and expands rows as necessary.
 *
 * @param {Array} inputRange - A 2D array where the first column is an identifier and the second column is the input text.
 * @param {Array} schemaRange - A 2D array where the first row contains column names and the second row contains their descriptions.
 * @param {string} [rowSeparator="|"] - The separator used to join rows in the output.
 * @param {string} [columnSeparator=","] - The separator used to join columns within each row.
 * @return {string} A string where each row is joined by columnSeparator and rows are joined by rowSeparator.
 * @throws {Error} If inputRange or schemaRange is not valid (e.g., incorrect size or format).
 */
function STRUCTIFY(inputRange, schemaRange, rowSeparator = "|", columnSeparator = ",") {
    // Validate the inputRange format
    validateInputRange(inputRange);

    // Validate the schemaRange format
    validateSchemaRange(schemaRange);

    // Parse the schema for later use
    const schema = parseSchema(schemaRange);

    const result = [];
    for (let i = 0; i < inputRange.length; i++) {
        const identifier = inputRange[i][0];
        const inputText = inputRange[i][1];

        const systemPrompt =
            "Your task is to convert natural language input into structured data based on a given schema. " +
            "The schema is provided as a JSON array where each item has a 'key' (the property name), a 'description' (explaining the attribute), " +
            "and a 'type' (indicating the expected data type such as string, number, boolean, or date). " +
            "Your job is to extract information from the input text and assign it to the corresponding 'key' in the schema. " +
            "The 'key' must always match the schema exactly and be in snake_case, while the values must match the expected 'type'. " +
            "The output must be a valid JSON array where each item corresponds to a single structured record. " +
            "Do not include any extra text outside the JSON structure.\n\n" +
            "Schema:\n" +
            `${JSON.stringify(schema, null, 2)}\n\n` +
            "Here is an example of the expected output format based on the schema:\n" +
            `${generateExampleOutput(schema)}\n\n` +
            "Each 'key' in the output corresponds to an entry in the schema. Below is a detailed explanation of each key:\n\n" +
            schema.map(item => `- ${item.key} (${item.type}): ${item.description}`).join("\n") + "\n\n" +
            "Now, process the following input text according to the schema and rules described above:\n";

        const rawOutput = callOpenAIAPI(systemPrompt, inputText);

        // Validate and parse the output into JSON
        const structuredData = parseJSON(rawOutput);

        // Normalize the result
        for (const row of structuredData) {
            result.push([identifier, ...Object.values(row)]);
        }
    }

    // Join rows and columns with the specified separators
    return result.map(row => row.join(columnSeparator)).join(rowSeparator);
}


/**
 * SCHEMIFY: Generates a schema from a natural language description.
 * Converts natural language (e.g., "name and age") into a schema table with keys, descriptions, and types.
 *
 * @param {string} naturalLanguageInput - A natural language description of the desired schema (e.g., "name and age").
 * @return {Array} A 2D array where the first row contains column names (keys), the second row contains their descriptions,
 * and the third row contains their types.
 * @throws {Error} If the OpenAI API response is not in the expected format or contains unsupported types.
 */
function SCHEMIFY(naturalLanguageInput) {
    // Use OpenAI API to generate a schema from natural language input
    const rawOutput = callOpenAIAPI(
        "Your task is to generate a JSON schema based on the natural language description provided below. " +
        "The schema should be represented as a JSON array where each item is an object containing a 'key', a 'description', and a 'type'. " +
        "The 'key' should be a concise, snake_case identifier representing the attribute in English. " +
        "The 'type' must be one of the following: 'string', 'number', 'date', or 'boolean', and it should always be written in English. " +
        "The 'description' should explain what the attribute represents in detail, and it must respect the language of the input description. " +
        "For example, if the input description is in Japanese, the 'description' should also be written in Japanese. " +
        "You must accurately interpret the input regardless of the language and output the schema in a mixed language format: " +
        "'key' and 'type' in English, but 'description' in the input language. " +
        "Do not include any text other than the JSON output. The output must strictly be valid JSON. " +
        "For example, if the input is 'name and age' (in English), the output should look like this:\n" +
        "[\n" +
        "  {\"key\": \"name\", \"description\": \"string which represents user name\", \"type\": \"string\"},\n" +
        "  {\"key\": \"age\", \"description\": \"number which represents user's age\", \"type\": \"number\"}\n" +
        "]\n" +
        "If the input is '名前と年齢' (in Japanese), the output should look like this:\n" +
        "[\n" +
        "  {\"key\": \"name\", \"description\": \"ユーザー名を表す文字列\", \"type\": \"string\"},\n" +
        "  {\"key\": \"age\", \"description\": \"ユーザーの年齢を表す数値\", \"type\": \"number\"}\n" +
        "]\n\n" +
        "Please make sure to only include attributes relevant to the natural language description provided below.\n\n" +
        "Input description: ",
        naturalLanguageInput
    );    

    // Validate and parse the output into JSON
    const schemaArray = parseJSON(rawOutput);

    // Validate that the parsed JSON is in the expected format (array of objects with 'key', 'description', and 'type')
    if (
        !Array.isArray(schemaArray) ||
        !schemaArray.every(
            item => item.key && item.description && item.type && ["string", "number", "date", "boolean"].includes(item.type)
        )
    ) {
        throw new Error(
            `Invalid schema format. Expected an array of objects with 'key', 'description', and 'type' (one of: string, number, date, boolean), but received: ${JSON.stringify(schemaArray)}`
        );
    }

    // Transform the schema into a 2D array format
    const columns = schemaArray.map(item => item.key); // Extract keys
    const descriptions = schemaArray.map(item => item.description); // Extract descriptions
    const types = schemaArray.map(item => item.type); // Extract types

    return [columns, descriptions, types];
}

/**
 * Validates the inputRange to ensure it has the expected format.
 * Throws an error if the inputRange does not have exactly 2 columns.
 *
 * @param {Array} inputRange - A 2D array where the first column is an identifier and the second column is the input text.
 * @throws {Error} If inputRange is not valid.
 */
function validateInputRange(inputRange) {
    if (!inputRange || inputRange.length === 0) {
        throw new Error('Invalid inputRange: The input range must contain at least one row.');
    }

    for (const row of inputRange) {
        if (!Array.isArray(row) || row.length !== 2) {
            throw new Error('Invalid inputRange: Each row must have exactly 2 columns (identifier and input text).');
        }
    }
}

/**
 * Validates the schemaRange to ensure it has the expected format.
 * Throws an error if the schemaRange does not have exactly 3 rows (keys, descriptions, and types) or if the first row is empty.
 *
 * @param {Array} schemaRange - A 2D array where the first row contains column names, the second row contains their descriptions, 
 * and the third row contains their types.
 * @throws {Error} If schemaRange is not valid.
 */
function validateSchemaRange(schemaRange) {
    if (!schemaRange || schemaRange.length < 3) {
        throw new Error(
            'Invalid schemaRange: The schema must have exactly 3 rows (column names, descriptions, and types).'
        );
    }

    const columnNames = schemaRange[0];
    if (!columnNames || columnNames.length === 0 || columnNames.every(name => !name)) {
        throw new Error('Invalid schemaRange: The first row (column names) must not be empty.');
    }

    const types = schemaRange[2];
    if (!types || types.length !== columnNames.length) {
        throw new Error('Invalid schemaRange: The third row (types) must have the same number of columns as the first row.');
    }

    const validTypes = ['string', 'number', 'date', 'boolean'];
    if (!types.every(type => validTypes.includes(type))) {
        throw new Error(
            `Invalid schemaRange: The third row (types) must contain only the following types: ${validTypes.join(', ')}.`
        );
    }
}


/**
 * Parses a schema from a schema range.
 *
 * @param {Array} schemaRange - A 2D array where the first row contains column names (keys),
 * the second row contains their descriptions, and the third row contains their types.
 * @return {Object[]} An array of objects representing the schema, where each object has 'key', 'description', and 'type'.
 */
function parseSchema(schemaRange) {
    const columns = schemaRange[0]; // First row: Column names (keys)
    const descriptions = schemaRange[1]; // Second row: Descriptions
    const types = schemaRange[2]; // Third row: Types

    return columns.map((key, index) => ({
        key,
        description: descriptions[index],
        type: types[index]
    }));
}

/**
 * Parses a raw output into JSON.
 * Extracts the first valid JSON object or array from the input, even if there is additional text.
 *
 * @param {string|Object} rawOutput - The raw output from OpenAI, either as a string or an object.
 * @return {Object} The parsed JSON object or array.
 * @throws {Error} If no valid JSON could be extracted or parsed.
 */
function parseJSON(rawOutput) {
    try {
        // If rawOutput is already an object or array, return it directly
        if (typeof rawOutput === 'object') {
            return rawOutput;
        }

        // Use a regular expression to extract the JSON part if necessary
        const jsonMatch = rawOutput.match(/(\{[\s\S]*\}|\[[\s\S]*\])/); // Matches JSON object or array
        if (!jsonMatch) {
            throw new Error("No valid JSON found in the output.");
        }

        // Parse the matched JSON string
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        Logger.log(`ERROR: Failed to parse JSON - ${error.message}`);
        throw new Error(`Failed to parse JSON: ${error.message}\nOutput received: ${rawOutput}`);
    }
}

/**
 * Generates an example JSON output based on the provided schema.
 * 
 * @param {Array} schema - An array of schema objects, where each object contains 'key', 'description', and 'type'.
 * @return {string} A formatted JSON string representing an example output.
 */
function generateExampleOutput(schema) {
    // Create a sample object based on the schema keys and types
    const exampleObject = {};
    schema.forEach(item => {
        switch (item.type) {
            case "string":
                exampleObject[item.key] = "ABC"; // Generic string example
                break;
            case "number":
                exampleObject[item.key] = 0; // Generic number example
                break;
            case "boolean":
                exampleObject[item.key] = false; // Generic boolean example
                break;
            case "date":
                exampleObject[item.key] = "2023-01-01"; // Generic date example (ISO format)
                break;
            default:
                exampleObject[item.key] = "N/A"; // Fallback for unknown types
        }
    });

    // Return the object as a formatted JSON string
    return JSON.stringify([exampleObject], null, 2);
}

/**
 * Calls the OpenAI API with the provided system prompt, user prompt, and model.
 * This function sends the specified prompts to the OpenAI API and returns the response.
 *
 * @param {string} systemPrompt - The system-level instruction or context for the model.
 * @param {string} userPrompt - The user-level input or query for the model.
 * @param {string} [model='gpt-4'] - The OpenAI model to use (default is 'gpt-4').
 * @return {string} The raw string output from the OpenAI API.
 * @throws {Error} If the API key is not set or if the API request fails.
 */
function callOpenAIAPI(systemPrompt, userPrompt, model = 'gpt-4') {
    // Retrieve the OpenAI API key from the script properties
    const token = getOpenAIKey(); // Throws an error if the key is not set

    // Construct the prompt payload for the OpenAI API
    const payload = {
        model: model, // Specify the model to use
        messages: [
            { role: 'system', content: systemPrompt }, // System-level prompt
            { role: 'user', content: userPrompt } // User-level prompt
        ],
        max_tokens: 1000 // The maximum number of tokens in the response
    };

    // Set up the options for the API request
    const options = {
        method: 'post', // HTTP POST method is used to send data to the API
        contentType: 'application/json', // The content type is set to JSON
        headers: {
            'Authorization': `Bearer ${token}` // Include the API key in the Authorization header
        },
        payload: JSON.stringify(payload) // Serialize the payload to JSON
    };

    try {
        // Send the request to the OpenAI API and get the response
        const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);

        // Check for non-200 HTTP response codes
        const responseCode = response.getResponseCode();
        if (responseCode !== 200) {
            throw new Error(`OpenAI API returned an error. HTTP Status: ${responseCode}, Response: ${response.getContentText()}`);
        }

        // Parse and return the JSON response from the API
        // Extract and return the content from the API response
        const responseData = JSON.parse(response.getContentText());
        return responseData.choices[0].message.content.trim(); // Return the message content
        
    } catch (error) {
        // Log and throw any errors that occur during the API request
        Logger.log(`ERROR: Failed to call OpenAI API - ${error.message}`);
        throw new Error(`Failed to call OpenAI API: ${error.message}`);
    }
}

/**
 * Checks if the OpenAI API key is set in the user properties.
 * If the key is set, logs and returns a success message.
 * If the key is not set, logs and returns an error message with instructions.
 *
 * @return {string} A message indicating whether the API key is set or not.
 */
function checkToken() {
    const properties = PropertiesService.getUserProperties();
    const token = properties.getProperty('OPENAI_API_KEY');

    if (token) {
        // Log success message if the key is found
        Logger.log('SUCCESS: OpenAI API key is set.');
        return 'SUCCESS: OpenAI API key is set.';
    } else {
        // Log error message and provide instructions if the key is missing
        Logger.log('ERROR: OpenAI API key is not set. Please register the token by running setOpenAIKey("YOUR_OPENAI_API_KEY").');
        return 'ERROR: OpenAI API key is not set. Please register the token by running setOpenAIKey("YOUR_OPENAI_API_KEY").';
    }
}

/**
 * Sets the OpenAI API key in the user properties.
 * This function is intended to be run by the user to securely store the API key.
 *
 * @param {string} token - The OpenAI API key to be saved.
 * @return {string} A confirmation message that the API key has been successfully set.
 * @throws {Error} If the provided token is empty or invalid.
 */
function setOpenAIKey(token) {
    if (!token) {
        // Throw an error if the token is empty
        throw new Error('API key cannot be empty. Please provide a valid API key.');
    }

    // Save the API key to the user properties
    const properties = PropertiesService.getUserProperties();
    properties.setProperty('OPENAI_API_KEY', token);

    // Log success message
    Logger.log('OpenAI API key has been successfully set.');
    return 'OpenAI API key has been successfully set.';
}

/**
 * Retrieves the OpenAI API key from the user properties.
 * If the key is not set, throws an error with instructions for the user.
 *
 * @return {string} The OpenAI API key.
 * @throws {Error} If the API key is not set in the user properties.
 */
function getOpenAIKey() {
    const properties = PropertiesService.getUserProperties();
    const token = properties.getProperty('OPENAI_API_KEY');

    if (!token) {
        // Log the error and throw an exception with clear instructions
        Logger.log('ERROR: OpenAI API key is not set. Please register the token as the user.');

        // Throw an error with step-by-step instructions for setting the key
        throw new Error(
            'OpenAI API key is not set.\n\n' +
            'Please follow these steps to register the API key:\n' +
            '1. Open the Google Apps Script Editor.\n' +
            '2. Run the following function:\n\n' +
            '   setOpenAIKey("YOUR_OPENAI_API_KEY");\n\n' +
            'Note: Replace "YOUR_OPENAI_API_KEY" with the actual API key.'
        );
    }

    // Return the API key if it is set
    return token;
}
