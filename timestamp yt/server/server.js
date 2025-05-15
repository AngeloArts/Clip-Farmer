import express from "express";
import { getClip, getClips, deleteClip, createClip } from "./database/clips.js";
import { createVideo, getVideoId } from "./database/video.js";
import cors from "cors"; // <- add this line
import axios from "axios";

const app = express();

app.use(cors()); // <- add this line
app.use(express.json());

//Global options
const instantDownload = false;

// Helper to create folder name from title
function generateFolderName(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

app.get("/", (req, res) => {
  res.send("hello dererere");
});

// get all clips
app.get("/clips", async (req, res) => {
  const clips = await getClips();
  res.status(200).json({ messasge: "here are your clips", clips });
});

app.get("/clips/:id", async (req, res) => {
  const { id: clipId } = req.params;
  const clip = await getClip(clipId);
  res.status(200).json({ message: "Here is your clip", clip });
});

app.post("/clips", async (req, res) => {
  const { title, startingTime, endingTime, youtubeUrl, contextt } = req.body;
  console.log("from our server last");
  console.log(startingTime);

  // cleans up the folder Name before passing it to the db (the title cleaned up basically)
  const safeFolderName = generateFolderName(title);
  // create the video in database
  const videoId = await createVideo(youtubeUrl, title, safeFolderName);

  const createdClip = await createClip(
    title,
    startingTime,
    endingTime,
    videoId,
    contextt
  );
  console.log("testab");
  console.log(createdClip);
  const clipId = createdClip[0].id;
  console.log(clipId);

  // if instant download options is enabled it will download when you press end, but rn just save clips
  // then mass download, better for now, with ui then make it better, maybe for creating the folder enable first
  if (instantDownload) {
    axios.post("http://localhost:3000/clip", {
      videoUrl: youtubeUrl,
      videoTitle: title,
      clipTitle: `${title}_${clipId}`,
      start: startingTime,
      end: endingTime,
    });
  }

  res.status(201).json({ message: "created clip", createdClip });
});

app.use((err, req, res, next) => {
  res.status(400).json({ message: "something bad happened" });
});

app.listen(3001, () => {
  console.log(`Listening on port ${3001}`);
});
