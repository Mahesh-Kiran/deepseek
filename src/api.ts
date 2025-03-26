import axios from 'axios';

const API_URL = "http://localhost:8000/generate";  // ✅ Connect to FastAPI

export async function fetchAICompletion(prompt: string): Promise<string> {
    try {
        const response = await axios.post(API_URL, { prompt, max_tokens: 1000 });
        return response.data.response.trim();
    } catch (error) {
        console.error("❌ FastAPI Error:", error);
        return "Error generating code.";
    }
}
