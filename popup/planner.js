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

function formatOutput(result, proficiency) {
  const lines = result.split("\n").map((line) => line.trim());
  let formatted = "";
  
  let currentDay = "";

  // Create a task list for all proficiency levels
  formatted += `<ul class="task-list">`; // Open the list for all proficiency levels

  lines.forEach((line) => {
    if (line.trim()) {
      if (line.startsWith("##")) {
        formatted += `<h3><strong>${line.slice(3).trim()}</strong></h3>`;
        currentDay = line.trim();
      }else {
        const listItem = line.slice(2).trim();
          const formattedParagraph = listItem
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") 
          .replace(/\((.*?)\)/g, "<i>($1)</i>"); 
        // Add each task as a list item
        formatted += `<li>${formattedParagraph}</li>`;
      }
    }
  });

  formatted += `</ul>`; // Close the list

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

    // Update prompt with proficiency level to ensure different outputs
    const prompt = `
      Generate a concise study plan for "${topic}" in least possible days but not more than 5-days. The user has ${timeAvailable} hours available daily and their proficiency level is "${proficiency}". 
      - For beginners: Provide 1-2 simple bullet points per day.
      - For intermediate: Provide 1-2 detailed tasks per day.
      - For advanced: Provide in-depth tasks per day.

      Each day should be labeled as "Day 1", "Day 2", etc., followed by 1-2 key tasks but not mention heading as key tasks. Avoid unnecessary repetition and be specific.
    `;

    const stream = session.promptStreaming(prompt);
    const outputElement = document.getElementById("output");
    outputElement.innerHTML = ""; // Clear previous output

    let result = "";
    let previousChunks = ""; // This will store previous content to avoid duplication

    // Process stream and collect the result progressively
    for await (const chunk of stream) {
      const newChunk = chunk.startsWith(previousChunks)
        ? chunk.slice(previousChunks.length)
        : chunk;
      
      // Append the new chunk to the result and display it immediately
      result += newChunk;
      outputElement.innerHTML = formatOutput(result, proficiency);
      
      // Update the previous chunk for comparison
      previousChunks = chunk;
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
