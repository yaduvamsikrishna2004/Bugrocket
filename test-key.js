// test-gemini.js
// 1. Paste your "AIzaSy..." key inside the quotes below:
const API_KEY = "AIzaSyCFdsHub-CDDxQNU5__5vBAzbNd2Doj98s"; 

async function testGemini() {
  console.log("Testing Gemini Key...");

  try {
    // We use the REST API directly so you don't need to install any packages
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Write a short haiku about coding." }] }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("\n✅ SUCCESS! Your API Key works.");
    console.log("🤖 Gemini says:", data.candidates[0].content.parts[0].text);

  } catch (error) {
    console.log("\n❌ FAILED. Your key or model is wrong.");
    console.error(error.message);
  }
}

testGemini();