import { randomUUID } from "crypto";
import { pool } from "./db.js";

export async function insertNewChangeLogRecord(userId: string) {

    const changeLogId = randomUUID();

    return await pool.query(`
            INSERT INTO change_log (
                change_log_id,
                user_id,
                change_log_timestamp
            ) VALUES ( $1, $2, now())
            RETURNING *           
            `,
        [changeLogId, userId]
    );
}