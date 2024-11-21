let session;
let sessionReady = false;
let resetInProgress = false; // Flag to track reset operations
let currentStream = null; // Reference to the active stream

// Function to initialize the session
async function initializeSession() {
  try {
    console.log("Initializing session...");
    const capabilities =
      await chrome.aiOriginTrial.languageModel.capabilities();
    session = await chrome.aiOriginTrial.languageModel.create({
      systemPrompt:
        "You are an AI assistant that generates concise, step-by-step study plans for any topic, tailored to the user's time and proficiency level.",
      temperature: Math.max(capabilities.defaultTemperature * 1.2, 2.0),
      topK: capabilities.defaultTopK,
    });
    sessionReady = true;
    console.log("AI session initialized.");
  } catch (error) {
    console.error("Failed to initialize session:", error);
    alert("Failed to initialize session.");
  }
}

// Utility to show/hide loader
function toggleLoader(show) {
  const loader = document.getElementById("loader");
  loader.style.display = show ? "block" : "none";
}

// Function to format the output
function formatOutput(result) {
  const lines = result.split("\n").map((line) => line.trim());
  let formatted = `<ul class="task-list">`;

  lines.forEach((line) => {
    if (line.startsWith("##")) {
      formatted += `<h3><strong>${line.slice(3).trim()}</strong></h3>`;
    } else if (line.startsWith("* ") && line.length > 2) {
      const listItem = line.slice(2).trim();
      const formattedItem = listItem
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\((.*?)\)/g, "<i>($1)</i>");
      formatted += `<li>${formattedItem}</li>`;
    } else {
      const formattedParagraph = line
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\((.*?)\)/g, "<i>($1)</i>");
      formatted += `<p>${formattedParagraph}</p>`;
    }
  });

  formatted += `</ul>`;
  return formatted;
}

// Function to generate the study plan
async function generateStudyPlan() {
  if (resetInProgress) {
    alert("Session is resetting. Please wait.");
    return;
  }

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
    toggleLoader(true);

    const prompt = `
      Generate a concise study plan for "${topic}" in least possible days . The user has ${timeAvailable} hours available and their proficiency level is "${proficiency}". 
      - For beginners: Provide 1-2 simple bullet points per day.
      - For intermediate: Provide 1-2 detailed tasks per day.
      - For advanced: Provide in-depth tasks per day.
      Each day should be labeled as "Day 1", "Day 2", etc.
    `;

    currentStream = session.promptStreaming(prompt);
    const outputElement = document.getElementById("output");
    outputElement.innerHTML = ""; // Clear previous output

    let result = "";
    let previousChunks = "";

    for await (const chunk of currentStream) {
      if (resetInProgress) {
        console.log("Reset in progress. Stopping output generation.");
        break; // Stop the output generation if the reset is in progress
      }

      const newChunk = chunk.startsWith(previousChunks)
        ? chunk.slice(previousChunks.length)
        : chunk;

      result += newChunk;
      previousChunks = chunk;

      outputElement.innerHTML = formatOutput(result);
    }
  } catch (error) {
    console.error("Error generating study plan:", error);
    document.getElementById("output").textContent =
      "Error generating study plan: " + error.message;
  } finally {
    toggleLoader(false);
  }
}

// Function to reset the session and clear inputs
async function resetSession() {
  if (resetInProgress) {
    alert("Reset already in progress.");
    return;
  }

  try {
    resetInProgress = true; // Lock the reset flag
    toggleLoader(true); // Show the loader during reset

    // Clear session and reset relevant variables
    session = null;
    sessionReady = false;
    currentStream = null;

    // Clear inputs and output immediately
    document.getElementById("topic").value = "";
    document.getElementById("timeAvailable").value = "";
    document.getElementById("proficiency").value = "beginner"; // Default selection
    document.getElementById("output").innerHTML = "";

    // Reinitialize the session
    await initializeSession();

    alert("Session reset successfully.");
  } catch (error) {
    console.error("Error resetting session:", error);
    alert("Failed to reset session.");
  } finally {
    resetInProgress = false; // Unlock the reset flag
    toggleLoader(false); // Hide the loader
  }
}

// Initialize session on page load
window.onload = async () => {
  console.log("Page loaded. Initializing AI session...");
  await initializeSession();
};

// Add event listeners for buttons
document
  .getElementById("generatePlan")
  .addEventListener("click", generateStudyPlan);
document.getElementById("resetSession").addEventListener("click", resetSession);

// Function to copy the generated study plan to the clipboard
function copyToClipboard() {
  const outputElement = document.getElementById("output");

  if (!outputElement || outputElement.innerText.trim() === "") {
    alert("No study plan to copy!");
    return;
  }

  navigator.clipboard
    .writeText(outputElement.innerText)
    .then(() => {
      alert("Study plan copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
      alert("Failed to copy study plan.");
    });
}

// Show the Copy button when the study plan is generated
function showCopyButton() {
  const copyButton = document.getElementById("copyPlan");
  copyButton.style.display = "inline-block";
}

// Attach the event listener for the Copy button
document.getElementById("copyPlan").addEventListener("click", copyToClipboard);

// Listen for changes in the `output` div and show the button when content is generated
const outputObserver = new MutationObserver(() => {
  const outputElement = document.getElementById("output");
  if (outputElement.innerText.trim() !== "") {
    showCopyButton();
  }
});

// Observe the output element for changes
outputObserver.observe(document.getElementById("output"), {
  childList: true,
  subtree: true,
});
