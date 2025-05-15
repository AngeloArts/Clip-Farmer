let startTime = null;
let endTime = null;
let isStartClicked = false;

function addTimestampButtons() {
  if (document.querySelector("#start-timestamp-btn")) return; // Ensure buttons aren't added twice

  const menuRow = document.querySelector("#top-level-buttons-computed");
  if (!menuRow) return; // Exit if the menuRow is not available

  // Create the three buttons
  const startButton = createButton(
    "▶️ Start",
    "start-timestamp-btn",
    handleStartClick
  );
  const endButton = createButton("⏹️ End", "end-timestamp-btn", handleEndClick);
  const cancelButton = createButton(
    "❌ Cancel",
    "cancel-timestamp-btn",
    handleCancelClick
  );

  // Add buttons to the menu
  menuRow.appendChild(startButton);
  menuRow.appendChild(endButton);
  menuRow.appendChild(cancelButton);
}

function createButton(text, id, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.id = id;

  // Style the button like a YouTube button
  Object.assign(button.style, {
    padding: "6px 12px",
    marginLeft: "8px",
    border: "none",
    background: "#f1f1f1",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  });

  button.addEventListener("click", onClick);
  return button;
}

function handleStartClick() {
  const video = document.querySelector("video");
  startTime = parseFloat(video?.currentTime || 0);
  isStartClicked = true;
  console.log("Start Time:", startTime);
}

function handleEndClick() {
  if (!isStartClicked) {
    alert("Please click 'Start' before clicking 'End'.");
    return;
  }

  const video = document.querySelector("video");
  endTime = parseFloat(video?.currentTime || 0);

  // Send the start and end time to the background script to save
  const title = document.title;
  const videoId = new URLSearchParams(location.search).get("v");
  const url = location.href;

  chrome.runtime.sendMessage({
    action: "saveTimeStamp",
    payload: {
      title,
      startingTime: startTime,
      endingTime: endTime,
      content: "temporary", // You can modify the content description as needed
    },
  });

  console.log("End Time:", endTime);
  resetTimestamps(); // Reset after saving
}

function handleCancelClick() {
  resetTimestamps();
  console.log("Timestamp operation cancelled.");
}

function resetTimestamps() {
  startTime = null;
  endTime = null;
  isStartClicked = false;
}

const observer = new MutationObserver(() => {
  addTimestampButtons(); // Try to add buttons when the DOM updates
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
