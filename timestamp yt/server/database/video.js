import { pool } from "./index.js";

export async function createVideo(title, youtubeUrl, folderName) {
  const [createdVideo] = await pool.query(
    "INSERT IGNORE INTO videos (title, youtube_url, folder_name) VALUES (?, ?, ?)",
    [title, youtubeUrl, folderName]
  );
  console.log(createdVideo);
  return await getVideoId(youtubeUrl);
}

// get video Id by using the link, returns the number
export async function getVideoId(youtubeUrl) {
  const [videoId] = await pool.query(
    "SELECT id, folder_name FROM videos WHERE youtube_url = ?",
    [youtubeUrl]
  );
  return videoId[0].id;
}
