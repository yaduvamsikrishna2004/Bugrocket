// list-models.js
const API_KEY = "AIzaSyCFdsHub-CDDxQNU5__5vBAzbNd2Doj98s"; 

async function getModels() {
  console.log("🔍 Asking Google for available models...");
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.models) {
      console.log("\n✅ AVAILABLE MODELS FOR YOU:");
      data.models.forEach(model => {
        // We only care about models that support 'generateContent'
        if (model.supportedGenerationMethods.includes("generateContent")) {
          console.log(`- ${model.name.replace('models/', '')}`); 
        }
      });
    } else {
      console.log("❌ No models found. Error:", data);
    }
    
  } catch (err) {
    console.log("Error:", err.message);
  }
}

getModels();