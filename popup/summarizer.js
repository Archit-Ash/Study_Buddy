
const inputText = document.getElementById("inputText");
const charCount = document.getElementById("charCount");
const summarizeBtn = document.getElementById("summarizeBtn");
const buttonText = document.getElementById("buttonText");
const loadingImage = document.getElementById("loadingImage");
const summaryText = document.getElementById("summaryText");


inputText.addEventListener("input", updateCharCount);


function updateCharCount() {
    const textLength = inputText.value.length;
    charCount.textContent = `${textLength}/4000 characters`;
    charCount.style.color = textLength > 4000 ? "red" : "black";
}


summarizeBtn.addEventListener("click", handleSummarization);


async function handleSummarization() {
    const inputValue = inputText.value.trim();
    summaryText.innerHTML = ""; 

  
    if (!inputValue) {
        summaryText.textContent = "Please enter some text to summarize.";
        return;
    }

   
    toggleButtonState(true);

    try {
       
        const canSummarize = await checkSummarizerCapabilities();
        if (canSummarize.available === "no") {
            summaryText.textContent = "Summarization is not supported on this device.";
            console.error("Summarizer not available:", canSummarize);
            return;
        }

        
        const summarizer = await initializeSummarizer(canSummarize);
        if (!summarizer) return; 

       
        const result = await summarizer.summarize(inputValue);
        displaySummary(result);

       
        summarizer.destroy();
    } catch (error) {
        handleSummarizationError(error);
    } finally {
       
        toggleButtonState(false);
    }
}


function toggleButtonState(isLoading) {
    buttonText.style.display = isLoading ? "none" : "inline";
    loadingImage.style.display = isLoading ? "inline-block" : "none";
}


async function checkSummarizerCapabilities() {
    try {
        console.log("Checking summarizer capabilities...");
        return await ai.summarizer.capabilities();
    } catch (error) {
        console.error("Error checking summarizer capabilities:", error);
        throw new Error("Unable to check summarizer capabilities.");
    }
}


async function initializeSummarizer(canSummarize) {
    try {
        let summarizer;
        console.log(canSummarize.available === "readily" ? "Creating summarizer directly..." : "Downloading summarizer model...");

        summarizer = await ai.summarizer.create();
        
        if (canSummarize.available !== "readily") {
            summarizer.addEventListener("downloadprogress", handleDownloadProgress);
            await summarizer.ready;
            console.log("Summarizer model ready.");
        }

        return summarizer;
    } catch (error) {
        console.error("Error initializing summarizer:", error);
        summaryText.textContent = "An error occurred while initializing the summarizer.";
        return null;
    }
}


function handleDownloadProgress(e) {
    console.log(`Download progress: ${e.loaded} / ${e.total}`);
}


function displaySummary(result) {
    if (result) {
        const points = result.split("*").filter(point => point.trim() !== "");
        summaryText.innerHTML = "<ul>" +
            points.map(point => `<li>${point.trim()}</li>`).join("") +
            "</ul>";
    } else {
        summaryText.textContent = "No summary generated.";
    }
}


function handleSummarizationError(error) {
    console.error("Error during summarization:", error);
    summaryText.textContent = "An error occurred while summarizing the text.";
}
