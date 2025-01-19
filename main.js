/**
 * STRUCTIFY: Processes input data against a schema and normalizes the result.
 * Converts natural language input into structured data and expands rows as necessary.
 *
 * @param {Array} inputRange - A 2D array where the first column is an identifier and the second column is the input text.
 * @param {Array} schemaRange - A 2D array where the first row contains column names and the second row contains their descriptions, and the third row contains data types.
 * @param {string} [rowSeparator="|"] - The separator used to join rows in the output.
 * @param {string} [columnSeparator=","] - The separator used to join columns within each row.
 * @return {string} A string where each row is joined by columnSeparator and rows are joined by rowSeparator.
 * @throws {Error} If inputRange or schemaRange is not valid (e.g., incorrect size or format).
 */
function STRUCTIFY(inputRange, schemaRange, rowSeparator = "|", columnSeparator = ",") {
    validateInputRange(inputRange);
    validateSchemaRange(schemaRange);

    // 1) schemaRange を parse
    const schemaArray = parseSchema(schemaRange);

    // 2) JSON Schema (トップレベルは 'object')
    //    - 'records' プロパティを配列にして、items をスキーマ定義
    const jsonSchema = {
        type: "object",
        properties: {
            records: {
                type: "array",
                items: {
                    type: "object",
                    properties: {},
                    required: [],
                    additionalProperties: false
                }
            }
        },
        required: ["records"],
        additionalProperties: false
    };

    // スキーマ配列 { key, description, type } を JSON Schema にマッピング
    schemaArray.forEach(({ key, description, type }) => {
        let schemaType;
        switch (type) {
            case "string":
                schemaType = "string";
                break;
            case "number":
                schemaType = "number";
                break;
            case "boolean":
                schemaType = "boolean";
                break;
            case "date":
                // 'date' はネイティブ対応がないので string 扱い
                schemaType = "string";
                break;
            default:
                schemaType = "string";
        }
        // プロパティ追加
        jsonSchema.properties.records.items.properties[key] = {
            type: schemaType,
            description: description
        };
        // required に追加
        jsonSchema.properties.records.items.required.push(key);
    });

    // 3) inputRange の各行を処理
    const resultRows = [];
    for (let i = 0; i < inputRange.length; i++) {
        const identifier = inputRange[i][0];
        const inputText = inputRange[i][1];

        // システムメッセージ例
        const systemPrompt = `
        You are provided with a JSON Schema that describes an object whose "records" property is an array of objects.
        Each object in "records" must strictly follow the schema (strict=true, no extra keys).
        Convert the user's input text into valid JSON for "records" according to the schema.
        If certain information is missing, fill with empty or default values.
      `;

        try {
            // 4) API呼び出し
            const responseObject = callOpenAIStructuredOutputs(systemPrompt, inputText, jsonSchema);
            // responseObject は { "records": [ {key1: val1, key2:val2 ...}, ... ] } の形になる
            const structuredDataArray = responseObject?.records;
            if (!Array.isArray(structuredDataArray)) {
                throw new Error("No valid 'records' array in the response");
            }

            // 5) structuredDataArray をループし、[identifier, ...values] の行データを作る
            for (const record of structuredDataArray) {
                // schemaArray の順番どおり値を取得
                const rowValues = schemaArray.map(s => record[s.key]);
                resultRows.push([identifier, ...rowValues]);
            }

        } catch (error) {
            Logger.log("Error or refusal: " + error);
            // fallback: push empty row if needed
            resultRows.push([identifier, ...schemaArray.map(() => "")]);
        }
    }

    // 6) 連結して返す
    return resultRows.map(row => row.join(columnSeparator)).join(rowSeparator);
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
    // システム指示文 (以前と同じ)
    const systemPrompt =
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
        "Input description: ";

    // ---- JSON Schema (ルートは "object") ----
    // 配列は "schema_items" のプロパティとして内包
    const schemaObj = {
        type: "object",
        properties: {
            schema_items: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        key: {
                            type: "string",
                            description: "A concise, snake_case identifier in English"
                        },
                        description: {
                            type: "string",
                            description: "Explanation in the same language as the input"
                        },
                        type: {
                            type: "string",
                            description: "One of: string, number, date, boolean",
                            enum: ["string", "number", "date", "boolean"]
                        }
                    },
                    required: ["key", "description", "type"],
                    additionalProperties: false
                }
            }
        },
        required: ["schema_items"],
        additionalProperties: false
    };

    // モデルからは「{ schema_items: [...] }」という形式で返ってくる
    const responseObject = callOpenAIStructuredOutputs(systemPrompt, naturalLanguageInput, schemaObj);

    // "schema_items" の配列があるか確認
    const schemaArray = responseObject?.schema_items;
    if (!Array.isArray(schemaArray)) {
        throw new Error("Invalid response: 'schema_items' is missing or not an array.");
    }

    // ---- バリデーション & 2D配列化 ----
    if (
        !schemaArray.every(
            item =>
                item.key &&
                item.description &&
                item.type &&
                ["string", "number", "date", "boolean"].includes(item.type)
        )
    ) {
        throw new Error(
            `Invalid schema format. Expected an array of objects with 'key', 'description', and 'type' (one of: string, number, date, boolean), but received: ${JSON.stringify(schemaArray)}`
        );
    }

    // カラム(キー), 記述, 型をそれぞれ抽出
    const columns = schemaArray.map(item => item.key);
    const descriptions = schemaArray.map(item => item.description);
    const types = schemaArray.map(item => item.type);

    // 3行構成の 2D 配列を返す
    return [columns, descriptions, types];
}


/**
 * callOpenAIStructuredOutputs: Calls the OpenAI Chat Completions API with Structured Outputs enabled.
 *
 * @param {string} systemPrompt - Instructions for the system.
 * @param {string} userText - The user's input text to be converted into structured JSON.
 * @param {Object} schemaObj - The JSON Schema object describing the required output structure.
 * @return {Array|Object} The JSON-parsed model output (most commonly an array if the schema is defined as `type="array"`).
 * @throws {Error} If the API call fails, the model refuses (refusal), or no valid JSON is returned.
 */
function callOpenAIStructuredOutputs(systemPrompt, userText, schemaObj) {

    // Retrieve the OpenAI API key from the script properties
    const apiKey = getOpenAIKey(); // Throws an error if the key is not set
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    const payload = {
        model: "gpt-4o-2024-08-06", // Adjust model as needed
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText }
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "structured_data",
                strict: true,
                schema: schemaObj
            }
        },
        max_tokens: 512
    };

    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        headers: {
            Authorization: "Bearer " + apiKey
        },
        muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());

    if (result?.error) {
        throw new Error("OpenAI API error: " + JSON.stringify(result.error));
    }
    if (result?.choices?.[0]?.message?.refusal) {
        throw new Error("Refusal: " + result.choices[0].message.refusal);
    }

    const content = result.choices[0].message?.content;
    if (!content) {
        throw new Error("No valid content in the response");
    }

    try {
        return JSON.parse(content);
    } catch (e) {
        throw new Error("Failed to parse JSON content: " + content);
    }
}

/**
 * parseSchema: Reads a 2D array and converts it into an array of { key, description, type }.
 *
 * @param {Array} schemaRange - A 2D array where:
 *   - row 1: list of column keys (e.g. ["name","age"])
 *   - row 2: descriptions for each key
 *   - row 3: data types for each key (e.g. "string","number","boolean","date")
 * @return {Object[]} An array of objects, each containing { key, description, type }.
 */
function parseSchema(schemaRange) {
    const columns = schemaRange[0];
    const descriptions = schemaRange[1];
    const types = schemaRange[2];
    return columns.map((key, i) => ({
        key,
        description: descriptions[i],
        type: types[i]
    }));
}

/**
 * validateInputRange: Checks whether inputRange is a valid 2D array.
 *
 * @param {Array} inputRange - A 2D array; row: [identifier, text].
 * @throws {Error} If inputRange is not valid.
 */
function validateInputRange(inputRange) {
    if (!Array.isArray(inputRange)) {
        throw new Error("inputRange must be an array");
    }
    // Additional validation as needed
}

/**
 * validateSchemaRange: Checks whether schemaRange is a valid 2D array with at least 3 rows.
 *
 * @param {Array} schemaRange - A 2D array; must have rows for keys, descriptions, and types.
 * @throws {Error} If schemaRange is not valid.
 */
function validateSchemaRange(schemaRange) {
    if (!Array.isArray(schemaRange) || schemaRange.length < 3) {
        throw new Error(
            "schemaRange must have at least 3 rows: keys, descriptions, and types."
        );
    }
    // Additional validation as needed
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
