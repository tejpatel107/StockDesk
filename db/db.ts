import dotenv from "dotenv";
import pg from "pg";
const { Pool } = pg;

dotenv.config({
  path: "../.env",
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

export const pool = new Pool({
  connectionString: databaseUrl,
});
