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
