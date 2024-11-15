chrome.commands.onCommand.addListener((command) => {
  if (command === "open_extension") {
    chrome.action.openPopup(); // Opens the extension popup
  }
});
