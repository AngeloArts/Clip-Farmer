console.log("THIS IS THE RIGHT FILE");
const express = require("express");
const app = express();
const { spawn } = require("child_process");
const fs = require("fs");
const getVideoSize = require("./fileSize");
const YTDlpWrap = require("yt-dlp-wrap").default;
const ytdlp = new YTDlpWrap("./yt-dlp.exe");
const cors = require("cors");

app.use(cors()); // Allow all origins

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("WELCOME ");
});

app.post("/download", async (req, res) => {
  try {
    const { url, outputPath: downloadPath, title: givenTitle } = req.body;

    if (!url) {
      return res.status(400).json({ message: "You must provide a valid URL" });
    }

    console.log("Received:", { url, givenTitle });
    console.log(downloadPath);

    let videoTitle = givenTitle;

    // Only fetch metadata if no title was given - just link
    if (!videoTitle) {
      // Get video info like title

      const rawMetadata = await ytdlp.execPromise([
        url,
        "--cookies",
        "./cookies.txt",
        "--dump-json",
      ]);

      const metadata = JSON.parse(rawMetadata);
      videoTitle = metadata.title;
    }
    // Sanitize title
    const safeTitle = videoTitle.replace(/[\\/:*?"<>|]/g, "").trim();

    // Call function that gets file size
    const videoSize = await getVideoSize(url);
    console.log(`Estimated Size: ${videoSize.toFixed(2)} MB`);

    // if download Path is provided it will use that for output path, otherwise default
    const outputPath = downloadPath
      ? downloadPath
      : `../videos/${safeTitle}.mp4`;

    // Spawn the yt-dlp process manually
    const ytDlpProcess = spawn("yt-dlp", [
      url,
      "--cookies",
      "./cookies.txt",
      "-f",
      // "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",exceeds 1080p if there ig
      "bestvideo[height<=1080]+bestaudio/best[height<=1080]", // Only up to 1080p
      "--merge-output-format",
      "mp4",
      "-o",
      outputPath,
      "--progress",
      "--no-cache-dir",
      "--no-playlist",
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

        console.log({
          progress: `${currentProgress}%`,
          // totalSize,
          currentSpeed,
          eta,
        });
      }
    });

    // Handle errors
    ytDlpProcess.on("error", (error) => {
      console.log("Error during download:", error);
      res.status(500).json({ message: "Download failed" });
    });
    // Capture stderr to see full logs or possible errors
    ytDlpProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
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
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
