require("dotenv").config({ path: "./backend/.env" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.OPENAI_API_KEY;
console.log("Using API Key:", apiKey);

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run() {
  try {
    const result = await model.generateContent("hello");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
