chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("hello");
  if (message.action === "saveTimeStamp") {
    const { title, startingTime, endingTime, youtubeUrl, contextt } =
      message.payload;
    console.log("starting time background", startingTime);

    fetch("http://localhost:3001/clips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        startingTime,
        endingTime,
        content,
        youtubeUrl,
        contextt,
      }),
    })
      .then((response) => response.json())
      .then((data) => console.log("Server response:", data))
      .catch((error) => console.error("Fetch error:", error));

    return true; // <- THIS is crucial to keep sendResponse alive
  }
});
