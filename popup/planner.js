let session;
let sessionReady = false;

async function initializeSession() {
  try {
    console.log("Initializing session...");
    session = await chrome.aiOriginTrial.languageModel.create({
      systemPrompt: "You are an AI assistant that generates concise, step-by-step study plans for any topic, tailored to the user's time and proficiency level.",
    });
    sessionReady = true;
    console.log("AI session initialized.");
  } catch (error) {
    console.error("Failed to initialize session:", error);
  }
}

function formatOutput(result) {
  const lines = result.split("\n").map((line) => line.trim());
  let formatted = "";
  let currentDay = "";

  
  lines.forEach((line) => {
    if (line.trim()) {
      if (line.startsWith("Day")) {
        formatted += `<h4><strong>${line.trim()}</strong></h4>`;
        currentDay = line.trim();
        formatted += `<ul class="task-list">`;

      } else {
        formatted += `<li class="task-item">${line.trim()}</li>`;

      }
    }
    return formatted;
  });

  // Wrap the list for beginners
  if (proficiency === "beginner") {
    formatted = `<ul>${formatted}</ul>`;
  }

  return formatted;
}

async function generateStudyPlan() {
  const topic = document.getElementById("topic").value.trim();
  const timeAvailable = document.getElementById("timeAvailable").value.trim();
  const proficiency = document.getElementById("proficiency").value;

  if (!topic || !timeAvailable) {
    alert("Please fill in all fields.");
    return;
  }

  if (!sessionReady) {
    alert("AI session is not initialized. Please wait and try again.");
    return;
  }

  try {
    document.getElementById("loader").style.display = "block";
    const prompt = `
      Generate a concise 5-day study plan for "${topic}". The user has ${timeAvailable} hours available daily and their proficiency level is "${proficiency}". 
      - For beginners: Provide 1-2 bullet points for each day, keeping it simple and crisp.
      - For intermediate: Provide slightly detailed guidance but still concise.
      - For advanced: Include in-depth suggestions but ensure brevity. 

      Each day should be labeled as "Day 1", "Day 2", etc., followed by 1-2 key tasks. Avoid unnecessary repetition and be specific.
    `;

    const stream = session.promptStreaming(prompt);
    const outputElement = document.getElementById("output");
    outputElement.innerHTML = ""; // Clear previous output

    let result = "";
    let previousChunks = ""; // This will store previous content to avoid duplication

    for await (const chunk of stream) {
      const newChunk = chunk.startsWith(previousChunks)
      ? chunk.slice(previousChunks.length)
      : chunk;
    result += newChunk;
    previousChunks = chunk;
     
      outputElement.innerHTML += newChunk;
    }
  } catch (error) {
    document.getElementById("output").textContent =
      "Error generating study plan: " + error.message;
  } finally {
    document.getElementById("loader").style.display = "none";
  }
}

window.onload = async () => {
  console.log("Page loaded. Initializing AI session...");
  await initializeSession();
};

document.getElementById("generatePlan").addEventListener("click", generateStudyPlan);
