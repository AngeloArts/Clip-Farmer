document.getElementById("folder").addEventListener("click", () => {
  async function sendVideoTitle() {
    let [tab] = await chrome.tabs.query({ active: true });

    const [{ result: cleanedTitle }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title;
        return title.replace(/^\(\d+\)\s*/, "").replace(" - YouTube", "");
      },
    });

    // Now send the message from the extension context (popup)
    chrome.runtime.sendMessage({
      action: "createFolder",
      title: cleanedTitle,
    });
  }

  sendVideoTitle();
});

document.getElementById("massDownload").addEventListener("click", () => {
  async function sendMassDownloadRequest() {
    let [tab] = await chrome.tabs.query({ active: true });

    const [{ result: pageInfo }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title
          .replace(/^\(\d+\)\s*/, "")
          .replace(" - YouTube", "");
        const url = window.location.href;
        return { title, url };
      },
    });

    chrome.runtime.sendMessage({
      action: "massDownload",
      payload: {
        title: pageInfo.title,
        youtubeUrl: pageInfo.url,
      },
    });
  }

  sendMassDownloadRequest();
});

document.getElementById("downloadBtn").addEventListener("click", async () => {
  async function downloadVideo() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.startsWith("http")) {
      console.error("Tab URL is not accessible or invalid:", tab);
      return;
    }

    const [{ result: pageInfo }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title
          .replace(/^\(\d+\)\s*/, "")
          .replace(" - YouTube", "");
        const url = window.location.href;
        return { title, url };
      },
    });

    chrome.runtime.sendMessage({
      action: "downloadVideo",
      payload: {
        title: pageInfo.title,
        youtubeUrl: pageInfo.url,
      },
    });

    document.getElementById("statusMessage").textContent =
      "⏳ Sending download request... ";
  }

  downloadVideo();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "logMessage") {
    const status = document.getElementById("statusMessage");
    if (status) {
      status.textContent = message.message;
    }
  }
});

// document.getElementById("massDownload").addEventListener("click", async () => {
//   let [tab] = await chrome.tabs.query({ active: true });

//   const youtubeUrl = tab.url;

//   chrome.runtime.sendMessage({
//     action: "massDownload",
//     youtubeUrl,
//   });
// });

// This did not work that is why it is commented - apparently you cant use chrome.runtime.sendMessage inside the function

// document.getElementById("folder").addEventListener("click", () => {
//   async function sendVideoTitle() {
//     let [tab] = await chrome.tabs.query({ active: true });
//     chrome.scripting.executeScript({
//       target: { tabId: tab.id },
//       func: () => {
//         const title = document.title; // Get the current page title

//         // Removes the number at the beginning(notification count or whatever) plus the - Youtube part at the end

//         let cleanedTitle = title
//           .replace(/^\(\d+\)\s*/, "")
//           .replace(" - YouTube", "");

//         console.log(cleanedTitle);

//         // Send message to background.js to create a folder
//         chrome.runtime.sendMessage({
//           action: "createFolder",
//           title: cleanedTitle,
//         });
//       },
//     });
//   }

//   sendVideoTitle();
// });
