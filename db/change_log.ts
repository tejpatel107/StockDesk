import { randomUUID } from "crypto";
import { pool } from "./db.js";
import type { PoolClient } from "pg";

export async function insertNewChangeLogRecord(userId: string, client?: PoolClient) {

    const db = client ?? pool;

    return await db.query(`
            INSERT INTO change_log (
                user_id,
                change_log_timestamp
            ) VALUES ($1, now())
            RETURNING *           
            `,
        [userId]
    );
}