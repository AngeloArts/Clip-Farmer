const mysql = require("mysql2");

// Create the pool connection directly (no need for async wrapper)
const pool = mysql
  .createPool({
    host: "localhost",
    user: "root",
    password: "password",
    database: "clipper",
  })
  .promise(); // Note: .promise() is synchronous

async function getVideoId(videoUrl) {
  const [video] = await pool.query(
    `
  SELECT id, title FROM videos WHERE youtube_url = ?
  `,
    [videoUrl]
  );
  // will return an object with id and title of the video
  return video[0];
}

async function getClips(videoId) {
  const [clips] = await pool.query(
    `
    SELECT * FROM clips WHERE video_id = ?
    `,
    [videoId]
  );
  return clips;
}

module.exports = {
  getClips,
  getVideoId,
  pool,
};
