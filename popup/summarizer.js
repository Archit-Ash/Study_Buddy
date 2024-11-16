document.getElementById("summarizeBtn").addEventListener("click", async () => {
    const inputText = document.getElementById("inputText").value;
    const summaryText = document.getElementById("summaryText");
  
    summaryText.textContent = "";
  
    if (!inputText.trim()) {
      summaryText.textContent = "Please enter some text to summarize.";
      return;
    }
  
    try {
      console.log("Checking summarizer capabilities...");
      const canSummarize = await ai.summarizer.capabilities();
      console.log("Summarizer capabilities:", canSummarize);
  
      if (canSummarize && canSummarize.available !== "no") {
        let summarizer;
  
        if (canSummarize.available === "readily") {
          console.log("Creating summarizer directly...");
          summarizer = await ai.summarizer.create();
        } else {
          console.log("Downloading summarizer model...");
          summarizer = await ai.summarizer.create();
          summarizer.addEventListener("downloadprogress", (e) => {
            console.log(`Download progress: ${e.loaded} / ${e.total}`);
          });
          await summarizer.ready;
          console.log("Summarizer model ready.");
        }
  
        console.log("Summarizing");
        const result = await summarizer.summarize(inputText);
        console.log("Summarization result:", result);
  
        if (result) {
          summaryText.textContent = result;
          console.log(typeof(result));
        } else {
          summaryText.textContent = "No summary generated.";
        }

        summarizer.destroy();
      } else {
        summaryText.textContent = "Summarization is not supported on this device.";
        console.error("Summarizer not available:", canSummarize);
      }
    } catch (error) {
      console.error("Error during summarization:", error);
      summaryText.textContent = "An error occurred while summarizing the text.";
    }
  });
  