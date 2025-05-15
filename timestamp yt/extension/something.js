const interval = setInterval(() => {
  const menuRow = document.querySelector("#top-level-buttons-computed");
  const alreadyExists = document.querySelector("#save-timestamp-btn");

  if (menuRow && !alreadyExists) {
    clearInterval(interval);

    const button = document.createElement("button");
    button.textContent = "💾 Save Timestamp";
    button.id = "save-timestamp-btn";

    // Optional: Make it look like a YouTube button
    button.style.padding = "6px 12px";
    button.style.marginLeft = "8px";
    button.style.border = "none";
    button.style.background = "#f1f1f1";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.fontWeight = "bold";

    // Add the button to the row
    menuRow.appendChild(button);

    button.addEventListener("click", () => {
      const video = document.querySelector("video");
      const time = video?.currentTime || 0;
      const title = document.title;
      const videoId = new URLSearchParams(location.search).get("v");
      const url = location.href;

      // Log it or send to backend here
      console.log({ title, videoId, time, url });

      // Example Axios call (uncomment when ready)
      // axios.post('https://your-api.com/save', {
      //   title, videoId, time, url
      // }).then(res => console.log(res.data));
    });
  }
}, 1000); // check every second
