import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

export const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DB_POOL_MAX ?? 20),          // default is 10
  idleTimeoutMillis: 30000,                           // close idle clients after 30s
  connectionTimeoutMillis: 5000,                      // fail fast instead of waiting forever
});

pool.on("error", (err) => {
  console.error("Unexpected pg pool error", err);
});

// setInterval(() => {
//   console.log({
//     total: pool.totalCount,
//     idle: pool.idleCount,
//     waiting: pool.waitingCount,
//   });
// }, 1000);