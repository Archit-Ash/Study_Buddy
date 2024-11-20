let session;
let sessionReady = false;

async function initializeSession() {
  try {
    console.log("Initializing session...");
    session = await chrome.aiOriginTrial.languageModel.create({
      systemPrompt: "You are an AI assistant that generates detailed, step-by-step study plans for any topic, tailored to the user's time and proficiency level.",
    });
    sessionReady = true;
    console.log("AI session initialized.");
  } catch (error) {
    console.error("Failed to initialize session:", error);
  }
}

function removeRepetitions(text) {
  const lines = text.split("\n").map((line) => line.trim());
  const uniqueLines = [];
  const seenLines = new Set();

  for (const line of lines) {
    if (!seenLines.has(line)) {
      uniqueLines.push(line);
      seenLines.add(line);
    }
  }

  return uniqueLines.join("\n");
}

function formatOutput(result, proficiency) {
  const lines = result.split("\n");
  let formatted = "";

  lines.forEach((line) => {
    if (line.startsWith("Day")) {
      formatted += `<h3>${line.trim()}</h3>`;
    } else if (line.trim()) {
      if (proficiency === "beginner") {
        formatted += `<li>${line.trim()}</li>`;
      } else {
        formatted += `<p>${line.trim()}</p>`;
      }
    }
  });

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
      Create a detailed study plan for "${topic}". The user has ${timeAvailable} hours available daily and their proficiency level is ${proficiency}. 
      - For "beginner", provide short and crisp bullet points for each day with unique content.
      - For "intermediate", provide step-by-step guidance covering subtopics.
      - For "advanced", provide in-depth analysis and advanced resources. 

      The plan should span 5 days (or fewer if appropriate), with each day covering a specific subtopic. Include headers for "Day 1", "Day 2", etc., and avoid repeating content. 
      Format the output clearly and concisely.
    `;

    const stream = session.promptStreaming(prompt);

    let result = "";
    const outputElement = document.getElementById("output");
    outputElement.innerHTML = "";

    for await (const chunk of stream) {
      result += chunk;
    }

    result = removeRepetitions(result); // Remove repetitions
    const formattedOutput = formatOutput(result, proficiency);
    outputElement.innerHTML = formattedOutput;
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
