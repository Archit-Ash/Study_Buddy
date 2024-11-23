let session;
let sessionReady = false;
let resetInProgress = false;
let currentStream = null;

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

function toggleLoader(show) {
  const loader = document.getElementById("loader");
  loader.style.display = show ? "block" : "none";
}

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

async function generateStudyPlan() {
  if (resetInProgress) {
    alert("Session is resetting. Please wait.");
    return;
  }

  const topic = document.getElementById("topic").value.trim();
  const timeAvailableInput = document.getElementById("timeAvailable");

  if (!timeAvailableInput || !timeAvailableInput.value.trim()) {
    alert("Please enter a valid number of hours.");
    return;
  }

  const timeAvailable = parseInt(timeAvailableInput.value.trim(), 10);
  const proficiency = document.getElementById("proficiency").value;

  if (isNaN(timeAvailable) || timeAvailable < 1 || timeAvailable > 24) {
    alert("Please enter a valid number of hours between 1 and 24.");
    timeAvailableInput.value = timeAvailable < 1 ? 1 : 24;
    return;
  }

  if (!topic) {
    alert("Please fill in all fields.");
    return;
  }

  if (!sessionReady) {
    alert("AI session is not initialized. Please wait and try again.");
    return;
  }

  try {
    toggleLoader(true);

    let prompt = `Generate a concise study plan for "${topic}" in least possible days, given ${timeAvailable} hours daily.`;

    if (proficiency === "beginner") {
      prompt += `
         The user is a beginner. Provide simple and easy-to-follow tasks, 1-2 direct bullet points per day. 
         Each day should be labeled as "Day 1", "Day 2", etc.`;
    } else if (proficiency === "intermediate") {
      prompt += `
         The user is intermediate. Provide detailed tasks, 1-2 bullet points per day. 
         Each day should be labeled as "Day 1", "Day 2", etc.`;
    } else if (proficiency === "advanced") {
      prompt += `
         The user is advanced. Provide in-depth, challenging tasks. Each day should be labeled as "Day 1", "Day 2", etc. Provide resources(if available).`;
    }

    currentStream = session.promptStreaming(prompt);
    const outputElement = document.getElementById("output");
    outputElement.innerHTML = "";

    let result = "";
    let previousChunks = "";

    for await (const chunk of currentStream) {
      if (resetInProgress) {
        console.log("Reset in progress. Stopping output generation.");
        break;
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

async function resetSession() {
  if (resetInProgress) {
    alert("Reset already in progress.");
    return;
  }

  try {
    resetInProgress = true;
    toggleLoader(true);
    session = null;
    sessionReady = false;
    currentStream = null;

    document.getElementById("topic").value = "";
    document.getElementById("timeAvailable").value = "";
    document.getElementById("proficiency").value = "beginner";
    document.getElementById("output").innerHTML = "";

    await initializeSession();

    alert("Session reset successfully.");
  } catch (error) {
    console.error("Error resetting session:", error);
    alert("Failed to reset session.");
  } finally {
    resetInProgress = false;
    toggleLoader(false);
  }
}

window.onload = async () => {
  console.log("Page loaded. Initializing AI session...");
  await initializeSession();
};

document
  .getElementById("generatePlan")
  .addEventListener("click", generateStudyPlan);
document.getElementById("resetSession").addEventListener("click", resetSession);

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

function showCopyButton() {
  const copyButton = document.getElementById("copyPlan");
  copyButton.style.display = "inline-block";
}

document.getElementById("copyPlan").addEventListener("click", copyToClipboard);

const outputObserver = new MutationObserver(() => {
  const outputElement = document.getElementById("output");
  if (outputElement.innerText.trim() !== "") {
    showCopyButton();
  }
});

outputObserver.observe(document.getElementById("output"), {
  childList: true,
  subtree: true,
});
