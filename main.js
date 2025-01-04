/**
 * Registers the STRUCTIFY and SCHEMIFY functions to the global scope.
 * @param {Object} globalScope - The global scope (usually "this") to register the functions.
 */
function init(globalScope) {
    globalScope.STRUCTIFY = function (inputRange, schemaRange) {
        return STRUCTIFY(inputRange, schemaRange);
    };

    globalScope.SCHEMIFY = function (naturalLanguageInput) {
        return SCHEMIFY(naturalLanguageInput);
    };
}

/**
 * STRUCTIFY: Processes input data against a schema and normalizes the result.
 * Converts natural language input into structured data and expands rows as necessary.
 *
 * @param {Array} inputRange - A 2D array where the first column is an identifier and the second column is the input text.
 * @param {Array} schemaRange - A 2D array where the first row contains column names and the second row contains their descriptions.
 * @return {Array} A 2D array of normalized structured data.
 * @throws {Error} If inputRange or schemaRange is not valid (e.g., incorrect size or format).
 */
function STRUCTIFY(inputRange, schemaRange) {
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
            "The schema is provided as a JSON array where each item has a 'key' (the property name) and a 'description' (explaining the attribute). " +
            "Your job is to extract information from the input text and assign it to the corresponding 'key' in the schema. " +
            "The 'key' must always match the schema exactly and be in snake_case, while the values should respect the language and format of the input text. " +
            "For example, if the input text is in Japanese, the output values should also be in Japanese. " +
            "The output must be a valid JSON array where each item corresponds to a single structured record. " +
            "Do not include any extra text outside the JSON structure.\n\n" +
            "Schema:\n" +
            `${JSON.stringify(schema)}\n\n` +
            "For reference only, here is a simplified example of how the schema and input text are related. " +
            "Do not copy this example directly into your output, but use it to understand the task:\n\n" +
            "Schema example: [{\"key\": \"name\", \"description\": \"string which represents user name\"}, " +
            "{\"key\": \"age\", \"description\": \"number which represents user's age\"}]\n" +
            "Input text: 'ジョンは25歳です' (in Japanese)\n" +
            "Output: [{\"name\": \"ジョン\", \"age\": 25}]\n\n" +
            "Now, process the following input text according to the schema and rules described above:\n";

        const rawOutput = callOpenAIAPI(systemPrompt, inputText);

        // Validate and parse the output into JSON
        const structuredData = parseJSON(rawOutput);

        // Normalize the result
        for (const row of structuredData) {
            result.push([identifier, ...Object.values(row)]);
        }
    }

    return result;
}


/**
 * SCHEMIFY: Generates a schema from a natural language description.
 * Converts natural language (e.g., "name and age") into a schema table with keys and descriptions.
 *
 * @param {string} naturalLanguageInput - A natural language description of the desired schema (e.g., "name and age").
 * @return {Array} A 2D array where the first row contains column names (keys) and the second row contains their descriptions.
 * @throws {Error} If the OpenAI API response is not in the expected format.
 */
function SCHEMIFY(naturalLanguageInput) {
    // Use OpenAI API to generate a schema from natural language input
    const rawOutput = callOpenAIAPI(
        "Your task is to generate a JSON schema based on the natural language description provided below. " +
        "The schema should be represented as a JSON array where each item is an object containing a 'key' and a 'description'. " +
        "The 'key' should be a concise, snake_case identifier representing the attribute, and the 'description' should explain what the attribute represents in detail in English. " +
        "The input description may be provided in any language (e.g., English, Japanese, etc.). " +
        "You must accurately interpret the input regardless of the language and output the schema in English. " +
        "Do not include any text other than the JSON output. The output must strictly be valid JSON. " +
        "For example, if the input is 'name and age' (in English) or '名前と年齢' (in Japanese), the output should look like this:\n" +
        "[\n" +
        "  {\"key\": \"name\", \"description\": \"string which represents user name\"},\n" +
        "  {\"key\": \"age\", \"description\": \"number which represents user's age\"}\n" +
        "]\n\n" +
        "Please make sure to only include attributes relevant to the natural language description provided below.\n\n" +
        "Input description: ",
        naturalLanguageInput
    );

    // Validate and parse the output into JSON
    const schemaArray = parseJSON(rawOutput);

    // Validate that the parsed JSON is in the expected format (array of objects with 'key' and 'description')
    if (!Array.isArray(schemaArray) || !schemaArray.every(item => item.key && item.description)) {
        throw new Error(
            `Invalid schema format. Expected an array of objects with 'key' and 'description', but received: ${JSON.stringify(schemaArray)}`
        );
    }

    // Transform the schema into a 2D array format
    const columns = schemaArray.map(item => item.key); // Extract keys
    const descriptions = schemaArray.map(item => item.description); // Extract descriptions

    return [columns, descriptions];
}
