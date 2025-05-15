const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const sanitize = require("sanitize-filename");
const { getVideoId, getClips, pool } = require("./clipperDB.js");

const app = express();
const PORT = 3000;

app.use(express.json());

// Tracks videos that are currently being downloaded
const downloadingVideos = new Set();

// Helper: ensure a folder exists
function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true }); // <- recursive explained below
    console.log(`created folder for ${folderPath}`);
  }
}

// Helper: download a video if it's not already being downloaded
async function downloadVideo(videoTitle, videoUrl, savePath) {
  if (downloadingVideos.has(videoTitle)) {
    console.log(`"${videoTitle}" is already being downloaded.`);
    return;
  }

  if (fs.existsSync(savePath)) {
    console.log(`"${videoTitle}" already exists.`);
    return;
  }

  downloadingVideos.add(videoTitle);

  try {
    console.log(`Requesting download for "${videoTitle}"...`);
    await axios.post("http://localhost:5000/download", {
      url: videoUrl,
      outputPath: savePath,
    });
    console.log(`Download finished for "${videoTitle}"`);
  } catch (err) {
    console.error(`Failed to download "${videoTitle}":`, err);
  } finally {
    downloadingVideos.delete(videoTitle);
  }
}

// Clips a video segment
// function clipVideo(fullVideoPath, start, end, outputClipPath) {
//   return new Promise((resolve, reject) => {
//     ffmpeg(fullVideoPath)
//       .setStartTime(start)
//       .setDuration(parseTimeToSeconds(start, end))
//       .output(outputClipPath)
//       .on("end", () => {
//         console.log(`Clip saved: ${outputClipPath}`);
//         resolve();
//       })
//       .on("error", (err) => {
//         console.error("Clipping error:", err);
//         reject(err);
//       })
//       .run();
//   });
// }
// Clips a video segment using float seconds
function clipVideo(fullVideoPath, start, end, outputClipPath) {
  const startSeconds = parseFloat(start);
  const endSeconds = parseFloat(end);
  const duration = endSeconds - startSeconds;

  return new Promise((resolve, reject) => {
    ffmpeg(fullVideoPath)
      .setStartTime(startSeconds)
      .setDuration(duration)
      // .videoCodec("libx264")
      // .addOption("-vf", "crop=iw-mod(iw\\,2):ih-mod(ih\\,2)") // ✅ this is the magic
      .output(outputClipPath)
      .on("end", () => {
        console.log(`Clip saved: ${outputClipPath}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("Clipping error:", err);
        reject(err);
      })
      // .on("start", (cmd) => {
      //   console.log("FFmpeg command:", cmd);
      // })
      // .on("stderr", (stderrLine) => {
      //   console.log("FFmpeg stderr:", stderrLine);
      // })
      .run();
  });
}

// Converts timestamp to duration in seconds
// Currently not using it
function parseTimeToSeconds(start, end) {
  const [sh, sm, ss] = start.split(":").map(Number);
  const [eh, em, es] = end.split(":").map(Number);
  return eh * 3600 + em * 60 + es - (sh * 3600 + sm * 60 + ss);
}

// Route to handle incoming clip request
app.post("/clip", async (req, res) => {
  console.log("yo yo yo");
  const { videoTitle, videoUrl, clipTitle, start, end } = req.body;

  if (!videoTitle || !videoUrl || !clipTitle || !start || !end) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  console.log("cliptitle", clipTitle);

  const safeTitle = sanitize(videoTitle);
  const safeClipTitle = sanitize(clipTitle); // NEW
  const folderPath = path.join(__dirname, "clips", safeTitle);
  const fullVideoPath = path.join(folderPath, `${safeTitle}.mp4`);
  const clipPath = path.join(folderPath, `${safeClipTitle}.mp4`);

  try {
    ensureFolderExists(folderPath);
    await downloadVideo(safeTitle, videoUrl, fullVideoPath);

    if (!fs.existsSync(fullVideoPath)) {
      return res.status(404).json({ error: "Video not available yet" });
    }

    await clipVideo(fullVideoPath, start, end, clipPath);
    res.status(200).json({ message: "Clip created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.post("/mass-download", async (req, res) => {
  const { videoUrl, onlyClipped = false } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing videoUrl" });
  }

  try {
    // 1. Get video ID and title from DB
    const video = await getVideoId(videoUrl);
    if (!video) return res.status(404).json({ error: "Video not found in DB" });

    const safeTitle = sanitize(video.title);
    const folderPath = path.join(__dirname, "clips", safeTitle);
    const fullVideoPath = path.join(folderPath, `${safeTitle}.mp4`);

    // 2. Download the full video
    ensureFolderExists(folderPath);
    await downloadVideo(safeTitle, videoUrl, fullVideoPath);

    if (!fs.existsSync(fullVideoPath)) {
      return res.status(404).json({ error: "Video file not ready yet" });
    }

    // 3. Fetch clips from DB
    const allClips = await getClips(video.id);
    const clipsToProcess = onlyClipped
      ? allClips.filter((clip) => !clip.clipped)
      : allClips;

    // 4. Process each clip
    for (const clip of clipsToProcess) {
      const { id, clip_title, start_time, end_time } = clip;
      const combinedTitle = `${clip_title}-${id}`;
      const safeClipTitle = sanitize(combinedTitle);
      const clipPath = path.join(folderPath, `${safeClipTitle}.mp4`);

      if (fs.existsSync(clipPath)) {
        console.log(`Clip already exists: ${safeClipTitle}`);
        continue;
      }

      await clipVideo(fullVideoPath, start_time, end_time, clipPath);

      // Optional: Update DB to mark as clipped
      await pool.query("UPDATE clips SET clipped = 1 WHERE id = ?", [id]);
    }

    res.status(200).json({ message: `All clips processed for ${video.title}` });
  } catch (err) {
    console.error("Mass download error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Clipper API listening on http://localhost:${PORT}`);
});
