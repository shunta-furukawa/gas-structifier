/**
 * Calls the OpenAI API with the provided system prompt, user prompt, and model.
 * This function sends the specified prompts to the OpenAI API and returns the response.
 *
 * @param {string} systemPrompt - The system-level instruction or context for the model.
 * @param {string} userPrompt - The user-level input or query for the model.
 * @param {string} [model='gpt-4'] - The OpenAI model to use (default is 'gpt-4').
 * @return {Object} The parsed JSON response from the OpenAI API.
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
        return JSON.parse(response.getContentText());
    } catch (error) {
        // Log and throw any errors that occur during the API request
        Logger.log(`ERROR: Failed to call OpenAI API - ${error.message}`);
        throw new Error(`Failed to call OpenAI API: ${error.message}`);
    }
}
