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

    return result;
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
