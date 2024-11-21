let session;
let isProcessing = false; // Prevent overlapping requests
let userPrompt = ""; // Store the original user prompt

// Display the session status
const sessionStatus = document.getElementById("sessionStatus");
document.addEventListener("DOMContentLoaded", function () {
  // Focus on the input field when the popup is loaded
  document.getElementById("promptInput").focus();
});

// Initialize the AI session
async function initializeSession() {
  try {
    sessionStatus.textContent = "Initializing session...";
    const capabilities =
      await chrome.aiOriginTrial.languageModel.capabilities();
    session = await chrome.aiOriginTrial.languageModel.create({
      systemPrompt:
        "You are an AI assistant designed to explain topics with clarity and adaptability. Your responses should be tailored to provide accurate, easy-to-understand, and contextually appropriate explanations. Simplify complex ideas when needed, focus on key points, and adjust your tone to suit the user's expectations, ensuring engaging and relevant communication at all times.",
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

// Updated Function to process and display the result
function processAndDisplayResult(rawText) {
  const outputDisplay = document.getElementById("output");

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
        // Start a code block with a special class for word wrapping
        formattedLines.push(
          '<pre style="background-color: #f4f4f4; padding: 10px; word-wrap: break-word; white-space: pre-wrap;">'
        );
      } else {
        formattedLines.push("</pre>");
      }
    } else if (insideCodeBlock) {
      // Inside a code block, escape HTML entities and ensure word wrap
      formattedLines.push(line.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    } else if (line.startsWith("###")) {
      // Convert ### to H3 tags
      formattedLines.push(`<h3>${line.slice(3).trim()}</h3>`);
    } else if (line.startsWith("##")) {
      // Convert ## to H2 tags
      formattedLines.push(`<h2>${line.slice(2).trim()}</h2>`);
    } else if (line.startsWith("#")) {
      // Convert # to H1 tags
      formattedLines.push(`<h1>${line.slice(1).trim()}</h1>`);
    } else if (line.startsWith("* ") && line.length > 2) {
      // Convert lines starting with "* " into list items
      const listItem = line.slice(2).trim();
      const formattedItem = listItem
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Handle bold within list items
        .replace(/\((.*?)\)/g, "<i>($1)</i>"); // Handle italics within parentheses in list items
      formattedLines.push(`<li>${formattedItem}</li>`);
    } else {
      // Handle other lines: bold (**word**), italics ((enclosed)), and plain text
      const formattedParagraph = line
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold text
        .replace(/\((.*?)\)/g, "<i>($1)</i>"); // Italicize parentheses
      formattedLines.push(`<p>${formattedParagraph}</p>`);
    }
  });

  // Join lines to reconstruct the HTML content
  let htmlContent = "";
  let isInList = false;

  formattedLines.forEach((formattedLine) => {
    if (formattedLine.startsWith("<li>")) {
      // Start a new list if not already inside one
      if (!isInList) {
        htmlContent += "<ul>";
        isInList = true;
      }
      htmlContent += formattedLine; // Add list item
    } else {
      // Close the list if transitioning out of a list
      if (isInList) {
        htmlContent += "</ul>";
        isInList = false;
      }
      htmlContent += formattedLine; // Add other formatted lines (H1, H2, paragraphs, etc.)
    }
  });

  // Close any unclosed list
  if (isInList) {
    htmlContent += "</ul>";
  }

  // Render the final content
  outputDisplay.innerHTML = htmlContent;
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
    const outputDisplay = document.getElementById("output");

    outputDisplay.textContent = ""; // Clear previous content

    for await (const chunk of stream) {
      const newChunk = chunk.startsWith(previousChunk)
        ? chunk.slice(previousChunk.length)
        : chunk;
      result += newChunk;
      previousChunk = chunk;

      // Update the displayed content incrementally
      outputDisplay.textContent += newChunk;
    }

    // Final processing and formatting of the result
    processAndDisplayResult(result);
  } catch (error) {
    document.getElementById("output").textContent =
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
    document.getElementById("output").textContent = ""; // Clear output
    console.log("Session reset successfully.");
    sessionStatus.textContent = "Session reset successfully.";
  } catch (error) {
    console.error("Error resetting session:", error);
    sessionStatus.textContent = "Failed to reset session.";
  }
}

// Trigger Quick Search on Enter key press
document.getElementById("promptInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    generatePoemWithAppend(
      "Forget all prior instructions and Provide a brief but complete explanation of this topic. Include a clear definition, key details, and any relevant examples or applications to ensure understanding within 100 words."
    );
  }
});

// Event listeners for buttons
document.getElementById("appendOption1").addEventListener("click", () => {
  generatePoemWithAppend(
    "Forget all prior instructions Explain this topic as simply as possible in 200-300 words. Use clear examples and analogies to make the concept easy to understand for someone without prior knowledge."
  );
});

document.getElementById("appendOption2").addEventListener("click", () => {
  generatePoemWithAppend(
    "Forget all prior instructions and Provide a brief but complete explanation of this topic. Include a clear definition, key details, and any relevant examples or applications to ensure understanding within 100 words."
  );
});

document.getElementById("appendOption3").addEventListener("click", () => {
  generatePoemWithAppend(
    "Forget all prior instructions and Provide a comprehensive explanation of this topic. Include a detailed definition, background, step-by-step processes, practical applications, advantages, disadvantages, and any relevant historical or scientific context."
  );
});

document.getElementById("resetSession").addEventListener("click", () => {
  resetSession();
});
function updateSessionStatus(statusText) {
  const sessionStatusElement = document.getElementById("sessionStatus");

  // Update the session status text
  sessionStatusElement.textContent = statusText;

  // Check the status text and apply the appropriate class
  if (
    statusText === "Session initialized successfully." ||
    statusText === "Session reset successfully."
  ) {
    sessionStatusElement.classList.add("green"); // Make it green
  } else {
    sessionStatusElement.classList.remove("green"); // Otherwise, keep it red
  }
}
