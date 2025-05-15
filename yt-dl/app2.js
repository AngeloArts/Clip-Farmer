const express = require("express");
const app = express();
const { spawn } = require("child_process");
const fs = require("fs");
const getVideoSize = require("./fileSize");
const YTDlpWrap = require("yt-dlp-wrap").default;
const ytdlp = new YTDlpWrap("./yt-dlp.exe");

app.use(express.json());

const url = "https://youtu.be/h2EEYQd0D-o?si=FZbtjx-x9OGB1O0N";

app.get("/", (req, res) => {
  res.status(200).send("WELCOME ");
});

app.post("/download", async (req, res) => {
  try {
    const url = req.body.url;

    if (!url) {
      res.status(400).json({ message: "You must provide a valid url" });
      return;
    }

    // Call function that gets file size
    const videoSize = await getVideoSize(url);
    console.log(`Estimated Size: ${videoSize.toFixed(2)} MB`);

    // Get video info like title
    const metadata = await ytdlp.getVideoInfo(url); // Assuming you have this function to get metadata
    console.log(metadata.title);
    const outputPath = `./videos/${metadata.title}.mp4`;

    // Spawn the yt-dlp process manually
    const ytDlpProcess = spawn("yt-dlp", [
      url,
      "-f",
      "best",
      "-o",
      outputPath,
      "--progress",
    ]);

    // Capture stdout to get progress updates
    ytDlpProcess.stdout.on("data", (data) => {
      const output = data.toString();

      // Regular expression to capture download progress
      const progressRegex =
        /\[download\] *([\d.]+)% of *([\d.]+[KMGT]?i?B) at *([\d.]+[KMGT]?i?B\/s) ETA ([\d:]+)?/;

      const match = output.match(progressRegex);
      if (match) {
        // Extract data
        currentProgress = match[1]; // Progress percentage
        totalSize = match[2]; // Total size
        const currentSpeed = match[3]; // Current speed
        const eta = match[4] || "Unknown"; // ETA

        console.log(`Progress: ${currentProgress}%`);
        console.log(`Total Size: ${totalSize}`);
        console.log(`Current Speed: ${currentSpeed}`);
        console.log(`ETA: ${eta}`);
      }
    });

    // Handle errors
    ytDlpProcess.on("error", (error) => {
      console.log("Error during download:", error);
      res.status(500).json({ message: "Download failed" });
    });

    // Handle the process close event (download finished)
    ytDlpProcess.on("close", () => {
      console.log("Download completed successfully!");
      res.status(200).json({ message: "Downloaded video successfully" });
    });

    console.log(`Process ID: ${ytDlpProcess.pid}`);
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ message: "Download failed" });
  }
});

// Server listen
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
