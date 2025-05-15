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

//options
const sealMode = false;

// Tracks videos that are currently being downloaded
const downloadingVideos = new Set();

// helper to get the acutal Video Path
function getActualVideoPath(folderPath, baseName) {
  const files = fs.readdirSync(folderPath);
  const match = files.find(
    (file) => file.startsWith(baseName) && /\.(mp4|mkv|webm)$/i.test(file)
  );
  return match ? path.join(folderPath, match) : null;
}

// Helper: ensure a folder exists
function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true }); // <- recursive explained below
    console.log(`created folder for ${folderPath}`);
  }
}

// Helper: download a video if it's not already being downloaded
async function downloadVideo(videoTitle, videoUrl, fullVideoPath) {
  if (downloadingVideos.has(videoTitle)) {
    console.log(`"${videoTitle}" is already being downloaded.`);
    return;
  }

  // Inside your downloadVideo function
  if (fs.existsSync(fullVideoPath)) {
    console.log(`${videoTitle} already exists.`);
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
    // seal mode after creating the folder for the video and clips
    // if (sealMode) {
    //   res.status(200).json({
    //     message:
    //       `Seal Mode is activated, ${folderPath} has been created, paste the video`,
    //   });
    //   return;
    // }
    // download the video if seal mode is off/manual mode
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

// Route or endpoint with controller for clipping multiple clips for a specific YoutubeUrl
app.post("/mass-clipper", async (req, res) => {
  const { videoUrl, onlyClipped = false } = req.body;
  console.log(videoUrl);

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing videoUrl" });
  }

  try {
    // 1. Get video ID and title from DB
    const video = await getVideoId(videoUrl);
    if (!video) return res.status(404).json({ error: "Video not found in DB" });

    const safeTitle = sanitize(video.title);
    const folderPath = path.join(__dirname, "clips", safeTitle);
    // const fullVideoPath = path.join(folderPath, `${safeTitle}.mp4`);
    const fullVideoPath = getActualVideoPath(folderPath, safeTitle);
    // even this one below is kinda redundant because donwloadVideo already checks if the video exists
    if (!fullVideoPath) {
      return res.status(404).json({ error: "Video not found after download." });
    }

    // 2. Download the full video
    ensureFolderExists(folderPath);
    await downloadVideo(safeTitle, videoUrl, fullVideoPath);

    // commented out because downloadVideo already checks if the video exists
    // if (!fs.existsSync(fullVideoPath)) {
    //   return res.status(404).json({ error: "Video file not ready yet" });
    // }

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

    console.log(`All clips processed for ${video.title}`);

    res.status(200).json({ message: `All clips processed for ${video.title}` });
  } catch (err) {
    console.error("Mass download error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Handles request to make a folder for the youtube Video
// then you manually paste video there o use the download video button
app.post("/folder", (req, res) => {
  const { videoTitle } = req.body;
  if (!videoTitle) {
    return res.status(400).json({ error: "Missing 'title' in request body" });
  }
  console.log(videoTitle);

  // Removes the number at the beginning(notfication count or whatever) plus the - Youtube part at the end
  let cleanedTitle = videoTitle
    .replace(/^\(\d+\)\s*/, "")
    .replace(" - YouTube", "");

  if (!videoTitle) {
    return res.status(400).json({ error: "Missing videoTitle" });
  }

  const safeTitle = sanitize(videoTitle);
  const folderPath = path.join(__dirname, "clips", safeTitle);

  if (fs.existsSync(folderPath)) {
    console.log(`Folder already exists for "${safeTitle}"`);
    return res.status(200).json({
      message: `Folder already exists: ${folderPath}. You can now paste the video.`,
    });
  }

  ensureFolderExists(folderPath);
  console.log(`Folder created for "${safeTitle}"`);
  res.status(201).json({
    message: `Folder created: ${folderPath}. You can now paste the video manually.`,
  });
});

app.listen(PORT, () => {
  console.log(`Clipper API listening on http://localhost:${PORT}`);
});
