let startTime = null;
let endTime = null;
let isStartClicked = false;

function addTimestampButtons() {
  if (document.querySelector("#start-timestamp-btn")) return;

  const menuRow = document.querySelector("#top-level-buttons-computed");
  if (!menuRow) return;

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

  menuRow.appendChild(startButton);
  menuRow.appendChild(endButton);
  menuRow.appendChild(cancelButton);

  injectButtonStyles(); // Add the active style to the page
}

function createButton(text, id, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.id = id;

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

  const startBtn = document.querySelector("#start-timestamp-btn");
  startBtn.classList.add("active-timestamp-btn");
}

async function handleEndClick() {
  if (!isStartClicked) {
    alert("Please click 'Start' before clicking 'End'.");
    return;
  }

  const video = document.querySelector("video");
  endTime = parseFloat(video?.currentTime || 0);

  const title = document.title;
  const videoId = new URLSearchParams(location.search).get("v");
  const url = location.href;

  const contextt = await window.prompt();

  chrome.runtime.sendMessage({
    action: "saveTimeStamp",
    payload: {
      title,
      startingTime: startTime,
      endingTime: endTime,
      youtubeUrl: url,
      contextt,
    },
  });

  console.log("End Time:", endTime);
  resetTimestamps();
}

function handleCancelClick() {
  resetTimestamps();
  console.log("Timestamp operation cancelled.");
}

function resetTimestamps() {
  startTime = null;
  endTime = null;
  isStartClicked = false;

  const startBtn = document.querySelector("#start-timestamp-btn");
  if (startBtn) startBtn.classList.remove("active-timestamp-btn");
}

function injectButtonStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .active-timestamp-btn {
      background-color: #007bff !important;
      color: white !important;
      box-shadow: 0 0 5px rgba(0, 123, 255, 0.7);
    }
  `;
  document.head.appendChild(style);
}

// MutationObserver to insert buttons
const observer = new MutationObserver(() => {
  addTimestampButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
