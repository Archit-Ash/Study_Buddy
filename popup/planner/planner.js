
// Function to generate study plan with streaming
async function generateStudyPlan() {
  const topic = document.getElementById("topic").value.trim();
  const timeSelect = document.getElementById("time");
  const goal = document.getElementById("goal").value.trim();
  const customTime = document.getElementById("customTime").value.trim();

  if (!topic || !goal || !timeSelect.value) {
    alert("Please fill all the fields.");
    return;
  }

  let time = timeSelect.value;
  if (time === "Custom" && customTime) {
    time = customTime + " minutes";
  }

  userPrompt = `Create a study plan for ${topic} for ${time} with the goal of ${goal}. Provide a detailed plan with recommended study steps.`;
  
}

// Reset session and clear inputs/outputs
async function resetSession() {
  try {
   
    session = null; // Clear existing session
    await initializeSession(); 
    document.getElementById("topic").value = ""; 
    document.getElementById("goal").value = ""; 
    document.getElementById("time").value = "";
    document.getElementById("customTime").value = ""; 
    studyPlanText.textContent = ""; 
    console.log("Session reset successfully.");
    sessionStatus.textContent = "Session reset successfully.";
  } catch (error) {
    console.error("Error resetting session:", error);
    sessionStatus.textContent = "Failed to reset session.";
  }
}

// Event listener for the "Generate Plan" button
document.getElementById("generatePlanBtn").addEventListener("click", generateStudyPlan);

// Event listener for resetting the session
document.getElementById("resetSession").addEventListener("click", resetSession);
