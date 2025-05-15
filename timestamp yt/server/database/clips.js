import { pool } from "./index.js";

export async function getClips() {
  const [clips] = await pool.query("SELECT * FROM clips");
  return clips;
}

export async function getClip(id) {
  const [clip] = await pool.query("SELECT * FROM clips WHERE id = ?", [id]);
  return clip;
}

export async function createClip(
  title,
  startingTime,
  endingTime,
  videoId,
  contextt
) {
  console.log("here");
  try {
    console.log("creating clip");
    console.log("videoId:", videoId);
    console.log("title:", title);
    console.log("startingTime:", startingTime);
    console.log("endingTime:", endingTime);
    console.log("context", contextt);

    const [createdClip] = await pool.query(
      `
      INSERT INTO clips(video_id, clip_title, start_time, end_time, contextt)
      VALUES (?, ?, ?, ?, ?)
      `,
      [videoId, title, startingTime, endingTime, contextt]
    );
    console.log(createdClip);
    return await getClip(createdClip.insertId);
  } catch (error) {
    console.log(error);
  }
}

export async function deleteClip(id) {
  const deletedClip = await pool.query(`DELETE FROM clips WHERE id = ?`, [id]);
  return "deleted clip";
}

// console.log(createClip("ANGELO FIRST", 10, 10, "First"));
