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
 * Throws an error if the schemaRange does not have exactly 2 rows or if the first row is empty.
 *
 * @param {Array} schemaRange - A 2D array where the first row contains column names and the second row contains their descriptions.
 * @throws {Error} If schemaRange is not valid.
 */
function validateSchemaRange(schemaRange) {
    if (!schemaRange || schemaRange.length < 2) {
        throw new Error('Invalid schemaRange: The schema must have exactly 2 rows (column names and descriptions).');
    }

    const columnNames = schemaRange[0];
    if (!columnNames || columnNames.length === 0 || columnNames.every(name => !name)) {
        throw new Error('Invalid schemaRange: The first row (column names) must not be empty.');
    }
}


/**
 * Parses a schema from a schema range.
 *
 * @param {Array} schemaRange - A 2D array where the first row contains column names (keys) and the second row contains their descriptions.
 * @return {Object[]} An array of objects representing the schema, where each object has a 'key' and a 'description'.
 */
function parseSchema(schemaRange) {
    const columns = schemaRange[0]; // First row: Column names (keys)
    const descriptions = schemaRange[1]; // Second row: Descriptions

    return columns.map((key, index) => ({
        key,
        description: descriptions[index]
    }));
}

/**
 * Parses a raw string into JSON.
 * Validates that the input is a valid JSON object.
 *
 * @param {string} rawOutput - The raw string output from OpenAI.
 * @return {Object} The parsed JSON object.
 * @throws {Error} If the input is not valid JSON.
 */
function parseJSON(rawOutput) {
    try {
        // Use a regular expression to extract the JSON part if necessary
        const jsonMatch = rawOutput.match(/{[\s\S]*}/); // Matches the first JSON object in the output
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
