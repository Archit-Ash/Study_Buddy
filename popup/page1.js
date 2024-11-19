let session;
let isProcessing = false; // Prevent overlapping requests
let userPrompt = ""; // Store the original user prompt

// Display the session status
const sessionStatus = document.getElementById("sessionStatus");

// Initialize the AI session
async function initializeSession() {
  try {
    sessionStatus.textContent = "Initializing session...";
    const capabilities =
      await chrome.aiOriginTrial.languageModel.capabilities();
    session = await chrome.aiOriginTrial.languageModel.create({
      temperature: Math.max(capabilities.defaultTemperature * 1.2, 2.0),
      topK: capabilities.defaultTopK,
    });
    sessionStatus.textContent = "Session initialized successfully.";
    console.log("Session initialized with custom temperature and topK.");
  } catch (error) {
    console.error("Error initializing session:", error);
    sessionStatus.textContent = "Failed to initialize session. Please reset.";
  }
}

initializeSession();

// Utility to show/hide loader
function toggleLoader(show) {
  const loader = document.getElementById("loader");
  loader.style.display = show ? "block" : "none";
}

// Function to process and display the result
function processAndDisplayResult(rawText) {
  const poemDisplay = document.getElementById("poem");

  // Split the response into lines
  const lines = rawText.split("\n").map((line) => line.trim());

  // Initialize variables for formatting
  let formattedLines = [];
  let insideCodeBlock = false;

  // Process each line
  lines.forEach((line) => {
    if (line.startsWith("```")) {
      // Toggle code block state
      insideCodeBlock = !insideCodeBlock;
      if (insideCodeBlock) {
        formattedLines.push(
          '<pre style="background-color: #f4f4f4; padding: 10px;">'
        );
      } else {
        formattedLines.push("</pre>");
      }
    } else if (insideCodeBlock) {
      // Inside a code block, escape HTML entities
      formattedLines.push(line.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    } else if (line.startsWith("*")) {
      // Convert lines starting with "*" into list items and process bold text
      formattedLines.push(
        `<li>${line
          .slice(1)
          .trim()
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")}</li>`
      );
    } else {
      // Replace **word** with <b>word</b> for bold text in normal paragraphs
      formattedLines.push(
        `<p>${line.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")}</p>`
      );
    }
  });

  // If there are list items, wrap them in a <ul>
  const listItems = formattedLines.filter((line) => line.startsWith("<li>"));
  const nonListItems = formattedLines.filter(
    (line) => !line.startsWith("<li>")
  );

  let htmlContent = "";
  if (listItems.length) {
    htmlContent += `<ul>${listItems.join("")}</ul>`;
  }
  htmlContent += nonListItems.join("");

  // Render the final content
  poemDisplay.innerHTML = htmlContent;
}

// Function to generate output with streaming
async function generatePoemWithAppend(optionText) {
  const inputField = document.getElementById("promptInput");
  userPrompt = inputField.value.trim(); // Update the original user prompt

  if (!session) {
    sessionStatus.textContent = "Session is not initialized. Please reset.";
    return;
  }

  if (!userPrompt) {
    alert("Please enter a prompt.");
    return;
  }

  if (isProcessing) {
    alert("Processing in progress. Please wait...");
    return;
  }

  try {
    isProcessing = true; // Block further requests
    toggleLoader(true); // Show loader
    const fullPrompt = `${userPrompt} ${optionText}`;
    const stream = session.promptStreaming(fullPrompt);

    let result = "";
    let previousChunk = "";
    const poemDisplay = document.getElementById("poem");

    poemDisplay.textContent = ""; // Clear previous content

    for await (const chunk of stream) {
      const newChunk = chunk.startsWith(previousChunk)
        ? chunk.slice(previousChunk.length)
        : chunk;
      result += newChunk;
      previousChunk = chunk;

      // Update the displayed content incrementally
      poemDisplay.textContent += newChunk;
    }

    // Final processing and formatting of the result
    processAndDisplayResult(result);
  } catch (error) {
    document.getElementById("poem").textContent =
      "Error generating output: " + error.message;
  } finally {
    isProcessing = false; // Unblock requests
    toggleLoader(false); // Hide loader
  }
}

// Reset session and clear inputs/outputs
async function resetSession() {
  try {
    sessionStatus.textContent = "Resetting session...";
    session = null; // Clear existing session
    await initializeSession(); // Reinitialize the session
    document.getElementById("promptInput").value = ""; // Clear input
    document.getElementById("poem").textContent = ""; // Clear output
    console.log("Session reset successfully.");
    sessionStatus.textContent = "Session reset successfully.";
  } catch (error) {
    console.error("Error resetting session:", error);
    sessionStatus.textContent = "Failed to reset session.";
  }
}

// Event listeners for buttons
document.getElementById("appendOption1").addEventListener("click", () => {
  generatePoemWithAppend("Explain This Topic to a 5 Year Old Kid");
});

document.getElementById("appendOption2").addEventListener("click", () => {
  generatePoemWithAppend("Explain this Topic");
});

document.getElementById("resetSession").addEventListener("click", () => {
  resetSession();
});
