function addSaveButton() {
  if (document.querySelector("#save-timestamp-btn")) return;

  const menuRow = document.querySelector("#top-level-buttons-computed");
  if (!menuRow) return;

  const button = document.createElement("button");
  button.textContent = "💾 Save Timestamp";
  button.id = "save-timestamp-btn";

  // Style it like a YT button
  button.style.padding = "6px 12px";
  button.style.marginLeft = "8px";
  button.style.border = "none";
  button.style.background = "#f1f1f1";
  button.style.borderRadius = "4px";
  button.style.cursor = "pointer";
  button.style.fontWeight = "bold";

  menuRow.appendChild(button);

  button.addEventListener("click", () => {
    const video = document.querySelector("video");
    const time = parseFloat(video?.currentTime || 0);
    const title = document.title;
    const videoId = new URLSearchParams(location.search).get("v");
    const url = location.href;

    chrome.runtime.sendMessage({
      action: "saveTimeStamp",
      payload: {
        title,
        startingTime: time,
        endingTime: time,
        content: "temporary",
      },
    });
  });
}

// Set up a MutationObserver
const observer = new MutationObserver(() => {
  addSaveButton(); // Try to add button when the DOM updates
});

// Watch for changes in the body of the page
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
