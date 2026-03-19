import { showToast } from './helpers';
export async function askGemini(prompt, systemInstruction = "") {
    const apiKey = localStorage.getItem('mylib_gemini_api_key');
    if (!apiKey) {
        showToast("Set Gemini API Key in Settings", "error");
        return null;
    }
    try {
        const genAI = new window.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: localStorage.getItem('mylib_gemini_model') || "gemini-3-flash-preview" });
        const result = await model.generateContent(systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt);
        return (await result.response).text();
    } catch (err) {
        showToast("AI Error: " + err.message, "error");
        return null;
    }
}
