chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("hello");
  if (message.action === "saveTimeStamp") {
    const { title, startingTime, endingTime, youtubeUrl, contextt } =
      message.payload;
    console.log("starting time background", startingTime);
    console.log(title);

    fetch("http://localhost:3001/clips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        startingTime,
        endingTime,
        youtubeUrl,
        contextt,
      }),
    })
      .then((response) => response.json())
      .then((data) => console.log("Server response:", data))
      .catch((error) => console.error("Fetch error:", error));

    return true; // <- THIS is crucial to keep sendResponse alive
  }

  if (message.action === "createFolder") {
    const { title } = message;
    console.log("Creating folder for title:", title);

    fetch("http://localhost:3000/folder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoTitle: title }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Folder created:", data);

        // ✅ Send message to the current active tab (YouTube page) - remove if you don't want
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "logMessage",
              message: `✅ Folder created for "${title}"`,
            });
          }
        });

        // Optional response to popup (not necessary if you don't use it)
        sendResponse({ status: "ok" });
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        sendResponse({ status: "error" });
      });

    return true; // Required to keep sendResponse alive
  }

  // Added mass downloader and it sends back message to broswer dev console
  if (message.action === "massDownload") {
    const { youtubeUrl, title } = message.payload;

    console.log(`Starting mass download for: ${title} (${youtubeUrl})`);

    fetch("http://localhost:3000/mass-download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoUrl: youtubeUrl, title }),
    })
      .then((response) => response.json())
      .then((data) => {
        // log to service worker
        console.log(`✅ Finished clipping all clips for: ${title}`);
        console.log(data);
        // Send to content script (YouTube tab)
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "logMessage",
              message: `✅ Finished clipping all clips for"${title}"`,
            });
          }
        });

        // Send to popup (only if open)
        chrome.runtime.sendMessage({
          action: "logMessage",
          message: `✅ Finished clipping all for video: "${title}"`,
        });
      })
      .catch((error) => console.error("Mass download error:", error));

    return true;
  }

  // Added video downloader
  if (message.action === "downloadVideo") {
    const { youtubeUrl, title } = message.payload;
    console.log(`Starting download for: ${title} (${youtubeUrl})`);

    fetch("http://localhost:5000/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: youtubeUrl,
        title,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        // log to service worker
        console.log(`✅ Finished downloading video: ${title}`);
        console.log(data);
        // Send to content script (YouTube tab)
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "logMessage",
              message: `✅ Finished downloading the video"${title}"`,
            });
          }
        });

        // Send to popup (only if open)
        chrome.runtime.sendMessage({
          action: "logMessage",
          message: `✅ Finished downloading "${title}"`,
        });

        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error("Download failed:", error);
        sendResponse({ success: false, error });
      });

    // Required for asynchronous response
    return true;
  }
});
