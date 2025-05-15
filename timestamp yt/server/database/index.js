import mysql from "mysql2";

export const pool = await mysql
  .createPool({
    host: "localhost",
    user: "root",
    password: "password",
    database: "clipper",
  })
  .promise();
