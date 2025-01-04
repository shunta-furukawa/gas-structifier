/**
 * Checks if the OpenAI API key is set in the script properties.
 * If the key is set, logs and returns a success message.
 * If the key is not set, logs and returns an error message with instructions.
 *
 * @return {string} A message indicating whether the API key is set or not.
 */
function checkToken() {
    const properties = PropertiesService.getScriptProperties();
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
 * Sets the OpenAI API key in the script properties.
 * This function is intended to be run by the administrator to securely store the API key.
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

    // Save the API key to the script properties
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('OPENAI_API_KEY', token);

    // Log success message
    Logger.log('OpenAI API key has been successfully set.');
    return 'OpenAI API key has been successfully set.';
}

/**
 * Retrieves the OpenAI API key from the script properties.
 * If the key is not set, throws an error with instructions for the administrator.
 *
 * @return {string} The OpenAI API key.
 * @throws {Error} If the API key is not set in the script properties.
 */
function getOpenAIKey() {
    const properties = PropertiesService.getScriptProperties();
    const token = properties.getProperty('OPENAI_API_KEY');

    if (!token) {
        // Log the error and throw an exception with clear instructions
        Logger.log('ERROR: OpenAI API key is not set. Please register the token as the administrator.');

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
