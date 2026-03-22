// --- generateQuiz.js - Final Enhanced Version ---

const Busboy = require('busboy');
const fetch = require('node-fetch');
// REMOVED PDF LIBRARIES AS PER PREVIOUS DECISION

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// *** USE THE USER-VERIFIED WORKING ENDPOINT ***
const API_VERSION = 'v1beta';
const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-05-20';
// *** ***
const API_TIMEOUT = 60000; // 60 seconds
const MAX_QUESTIONS = 100; const MAX_OPTIONS = 10;
const MIN_QUESTIONS = 1; const MIN_OPTIONS = 2;
const MAX_FILE_CONTENT_LENGTH = 30000; // Limit text sent from files

// --- Helper: Robust JSON Extraction ---
function extractJsonArray(text) {
    if (!text || typeof text !== 'string') { throw new Error("Invalid input text for JSON extraction."); }
    console.log("[DEBUG] Raw AI Response Text (start):", text.substring(0, 300) + "...");
    // Attempt 1: Look for JSON within markdown code blocks ```json ... ```
    let match = text.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonString = match ? match[1].trim() : null; // Trim whitespace within block
    if (jsonString) console.log("[DEBUG] Found JSON in markdown block.");

    // Attempt 2: If no code block, look for the first '[' and last ']'
    if (!jsonString) {
        console.log("[DEBUG] No markdown block found, searching for [ and ]...");
        const startIndex = text.indexOf('[');
        const endIndex = text.lastIndexOf(']');
        if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) { // endIndex can equal startIndex for []
            jsonString = text.substring(startIndex, endIndex + 1);
            console.log("[DEBUG] Found JSON using brackets.");
        } else {
            // Attempt 3: Maybe the whole string IS the JSON (less likely but possible)
            jsonString = text.trim();
             console.log("[DEBUG] Assuming entire trimmed text might be JSON.");
        }
    }

    if (!jsonString) {
        console.error("[ERROR] Could not find any potential JSON array structure.");
        throw new Error("Could not find a JSON array structure in the AI response.");
    }

    try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) {
            console.error("[ERROR] Extracted JSON string was not an array:", jsonString.substring(0, 300));
           throw new Error("Extracted JSON is not an array.");
        }
        // Basic validation: Check structure of the first item if array is not empty
        if (parsed.length > 0 && (typeof parsed[0] !== 'object' || !parsed[0].question || !Array.isArray(parsed[0].options) || !parsed[0].answer)) {
            console.warn("[VALIDATION] Parsed JSON array items might lack required keys or have wrong types.");
        }
        console.log("[DEBUG] JSON Parsed successfully.");
        return parsed; // Return the parsed array
    } catch (parseError) {
        console.error("[FATAL JSON PARSE ERROR] Failed to parse string:", jsonString.substring(0, 500) + "...");
        console.error("Parse Error Details:", parseError);
        throw new Error(`Failed to parse extracted JSON from AI response.`);
    }
}

// --- Helper: Parse Multipart Form Data ---
function parseMultipartForm(event) {
     return new Promise((resolve, reject) => {
        console.log("[DEBUG] Starting multipart form parsing...");
        try {
            const busboy = Busboy({ headers: { 'content-type': event.headers['content-type'] || event.headers['Content-Type'] } });
            const fields = {}; const files = {};
            busboy.on('file', (fieldname, file, { filename, mimeType }) => {
                console.log(`[DEBUG] Receiving file: ${filename}, Type: ${mimeType}`);
                const chunks = [];
                file.on('data', (chunk) => chunks.push(chunk));
                file.on('end', () => { files[fieldname] = { content: Buffer.concat(chunks), filename, mimeType }; console.log(`[DEBUG] Finished receiving file: ${filename}`); });
                file.on('error', (err) => { console.error("[ERROR] File stream error:", err); reject(new Error(`File stream error: ${err.message}`)); });
            });
            busboy.on('field', (fieldname, val) => { console.log(`[DEBUG] Received field: ${fieldname}`); fields[fieldname] = val; });
            busboy.on('finish', () => { console.log("[DEBUG] Busboy finished parsing."); resolve({ fields, files }); });
            busboy.on('error', err => { console.error("[ERROR] Busboy parsing error:", err); reject(new Error(`Busboy parsing error: ${err.message}`)); });
            busboy.end(Buffer.from(event.body, 'base64'));
        } catch (err) { console.error("[ERROR] Busboy initialization error:", err); reject(new Error(`Busboy initialization error: ${err.message}`)); }
     });
}

// --- Main Handler Function ---
exports.handler = async (event) => {
    console.log("[INFO] generateQuiz function invoked. Method:", event.httpMethod);
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    if (!GEMINI_API_KEY) { console.error("[FATAL] API key missing."); return { statusCode: 500, body: JSON.stringify({ error: "Server config error." }) }; }
    console.log("[INFO] API Key found.");

    // --- USE THE USER-VERIFIED WORKING URL ---
    const apiUrl = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    console.log("[INFO] Using API URL:", apiUrl);

    try {
        let prompt;
        let numQuestions, numOptions, difficulty;
        const isFileUpload = event.headers['content-type']?.includes('multipart/form-data');
        console.log("[INFO] Request type:", isFileUpload ? "File Upload" : "Topic");

        if (isFileUpload) {
            const { fields, files } = await parseMultipartForm(event);
            const config = JSON.parse(fields.config || '{}');
            const file = files.file;

            if (!file || !file.content || file.content.length === 0) throw new Error("File not found or empty in the request.");
            if (!config.instruction) throw new Error("Instruction is missing in the request config.");

            // Validate and Clamp User Inputs
            numQuestions = Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, parseInt(config.numQuestions, 10) || 5));
            numOptions = Math.max(MIN_OPTIONS, Math.min(MAX_OPTIONS, parseInt(config.numOptions, 10) || 4));
            difficulty = ['Easy', 'Moderate', 'Hard'].includes(config.difficulty) ? config.difficulty : 'Moderate';
            console.log(`[INFO] File Params: Name=${file.filename}, Type=${file.mimeType}, Size=${file.content.length}, Qs=${numQuestions}, Opts=${numOptions}, Diff=${difficulty}`);

            // --- Simplified File Reading (No PDF) ---
            if (file.mimeType === 'application/pdf' || file.mimeType === 'text/markdown') {
                 console.warn(`[WARN] Unsupported file type received: ${file.mimeType}. Rejecting.`);
                 throw new Error(`Sorry, ${file.mimeType === 'application/pdf' ? 'PDF' : 'Markdown'} files are not supported. Please upload a plain text file (.txt, .csv).`);
            }
            console.log("[INFO] Reading file as text...");
            let fileContent = file.content.toString('utf-8');
            console.log(`[INFO] Text file read. Original Length: ${fileContent.length}`);
            // --- End Simplified File Reading ---

            if (fileContent.length > MAX_FILE_CONTENT_LENGTH) {
                 console.warn(`[WARN] Truncating file content from ${fileContent.length} to ${MAX_FILE_CONTENT_LENGTH}.`);
                 fileContent = fileContent.substring(0, MAX_FILE_CONTENT_LENGTH);
            }

            // --- *** ENHANCED PROMPT FOR FILE MODE *** ---
            prompt = `
ROLE: You are an expert quiz generation AI. Your task is to create a high-quality educational quiz based *exclusively* on the provided text document and the user's specific instructions. Adhere strictly to all constraints.

USER INSTRUCTION: "${config.instruction}"

DOCUMENT CONTENT:
--- START ---
${fileContent}
--- END ---

QUIZ REQUIREMENTS:
1.  Number of Questions: Exactly ${numQuestions}.
2.  Difficulty Level: ${difficulty}. Adjust question complexity accordingly based *only* on the provided text.
3.  Choices per Question: Exactly ${numOptions}. Ensure all options are plausible but only one is correct according to the document.
4.  Source Material: Base ALL questions and answers *strictly* on the DOCUMENT CONTENT provided above. Do not use external knowledge.
5.  Answer Format: The 'answer' field in the output must perfectly match the text of one of the strings in the 'options' array for that question.

OUTPUT FORMAT:
Respond ONLY with a valid JSON array of objects. Do NOT include any introductory text, explanations, apologies, or markdown formatting like \`\`\`json. The response must start directly with '[' and end directly with ']'.
Each object in the array must have the following keys and value types:
- "question": (String) The text of the question.
- "options": (Array of Strings) An array containing exactly ${numOptions} possible answers.
- "answer": (String) The exact text of the correct answer, which must be present in the 'options' array.

Example of ONE object in the array:
{"question": "What color is the sky in the document?", "options": ["Blue", "Green", "Red"], "answer": "Blue"}

Generate the JSON array now based on the document and requirements.
`;
            // --- *** END ENHANCED PROMPT *** ---

        } else { // Topic Mode
             const body = JSON.parse(event.body || '{}');
             if (!body.topic) throw new Error("Topic is missing in the request body.");

             // Validate and Clamp User Inputs
             numQuestions = Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, parseInt(body.numQuestions, 10) || 5));
             numOptions = Math.max(MIN_OPTIONS, Math.min(MAX_OPTIONS, parseInt(body.numOptions, 10) || 4));
             difficulty = ['Easy', 'Moderate', 'Hard'].includes(body.difficulty) ? body.difficulty : 'Moderate';
             console.log(`[INFO] Topic Params: Topic=${body.topic}, Qs=${numQuestions}, Opts=${numOptions}, Diff=${difficulty}`);

            // --- *** ENHANCED PROMPT FOR TOPIC MODE *** ---
            prompt = `
ROLE: You are an expert quiz generation AI. Your task is to create a high-quality educational quiz based on the provided topic and constraints. Adhere strictly to all constraints.

TOPIC: "${body.topic}"

QUIZ REQUIREMENTS:
1.  Number of Questions: Exactly ${numQuestions}.
2.  Difficulty Level: ${difficulty}. Adjust question complexity accordingly.
3.  Choices per Question: Exactly ${numOptions}. Ensure all options are plausible but only one is correct.
4.  Answer Format: The 'answer' field in the output must perfectly match the text of one of the strings in the 'options' array for that question.

OUTPUT FORMAT:
Respond ONLY with a valid JSON array of objects. Do NOT include any introductory text, explanations, apologies, or markdown formatting like \`\`\`json. The response must start directly with '[' and end directly with ']'.
Each object in the array must have the following keys and value types:
- "question": (String) The text of the question.
- "options": (Array of Strings) An array containing exactly ${numOptions} possible answers.
- "answer": (String) The exact text of the correct answer, which must be present in the 'options' array.

Example of ONE object in the array:
{"question": "What is the capital of France?", "options": ["Berlin", "Madrid", "Paris", "Rome"], "answer": "Paris"}

Generate the JSON array now based on the topic and requirements.
`;
            // --- *** END ENHANCED PROMPT *** ---
        }

        // Add generationConfig for JSON mode directly in the payload
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        console.log("[INFO] Sending request to Gemini API. Prompt Role:", prompt.split('\n')[1]); // Log the role part

        // --- Call Gemini API (Keep timeout logic) ---
        let response;
        try {
            response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), timeout: API_TIMEOUT });
            console.log(`[INFO] Gemini Status: ${response.status}`);
        } catch (fetchError) {
            // Handle timeouts vs other network errors
            if (fetchError.type === 'request-timeout') { console.error(`[ERROR] Gemini Timeout after ${API_TIMEOUT / 1000}s.`); throw new Error(`AI request timed out.`); }
            else { console.error(`[ERROR] Network error:`, fetchError); throw new Error(`Network error.`); }
        }

        if (!response || !response.ok) {
            // Try to get more detailed error from Gemini response body
            let errorBodyText = "Unknown API error";
            try { errorBodyText = await response.text(); } catch (e) { /* ignore inability to read body */ }
            console.error("[ERROR] Gemini Error. Status:", response.status, "Body:", errorBodyText.substring(0, 500)); // Log raw error body
            let detail = 'Failed AI generation.';
            try { detail = JSON.parse(errorBodyText)?.error?.message || detail; } catch (e) { /* ignore inability to parse body */ }
            throw new Error(detail);
        }
        // --- End Call Gemini API ---

        const result = await response.json(); // If response.ok, Gemini *should* return JSON because of generationConfig
        console.log("[INFO] Gemini Success. Processing response...");

        // Directly access the expected text part from the JSON response
        const aiResponseText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiResponseText) {
             console.error("[ERROR] Invalid Gemini response structure (missing text part):", JSON.stringify(result).substring(0, 500));
             throw new Error("AI returned an unexpected response structure.");
        }

        // Use robust extraction just in case the model ignored the JSON mode instruction
        const quizDataArray = extractJsonArray(aiResponseText);
        console.log(`[INFO] Parsed quiz. Actual Qs returned: ${quizDataArray.length}`);

        // Final validation before sending back
        if (quizDataArray.length === 0) {
            throw new Error("AI returned an empty quiz array.");
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizDataArray) // Send back the validated, parsed array
        };

    } catch (error) {
        console.error("[FATAL] Error in generateQuiz handler:", error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message || "Internal server error." })
        };
    }
};