const express = require("express");
const app = express();
const YTDlpWrap = require("yt-dlp-wrap").default;
const fs = require("fs");
const ytdlp = new YTDlpWrap("./yt-dlp.exe");
const getVideoSize = require("./fileSize");

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

    // get video info like title
    let metadata = await ytdlp.getVideoInfo(url);
    console.log(metadata.title);
    const outputPath = `./videos/${metadata.title}.mp4`;

    // call function that gets file size
    const videoSize = await getVideoSize(url);
    console.log(`Estimated Size: ${videoSize.toFixed(2)} MB`);

    // start download
    const ytDlpEventEmitter = ytdlp
      .exec([url, "-f", "best", "-o", outputPath])
      .on("progress", (progress) => {
        console.log(`Progress: ${progress.percent.toFixed(2)}%`);
        console.log(`Speed: ${progress.currentSpeed}`);
      })
      .on("error", (error) => {
        console.log(error);
      })
      .on("close", () => {
        console.log("finished downloading successfully");
        res.status(200).json({ message: "Downloaded video successfully" });
      });
    console.log(`Process ID: ${ytDlpEventEmitter.ytDlpProcess.pid}`);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Download failed" });
  }
});

//server listen
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
