import { randomUUID, type UUID } from "node:crypto";
import { pool } from "../../../db/db.js";
import type { roles } from "../../../db/roles.js";

interface UserRecord {
    email: string,
    password: string,
    id: UUID,
    role: roles
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
    let query = `
        SELECT user_email AS email, 
               user_password AS "password",
               user_id AS "id",
               user_role AS "role"
               FROM "user" WHERE user_email = $1;`;

    try {
        return (await pool.query<UserRecord>(query, [email])).rows[0];
    } catch (error) {
        throw error;
    }
}

export async function createNewUser(name: string, email: string, password: string, role: roles): Promise<UserRecord | undefined> {

    const userId = randomUUID();
    const changeLogId = randomUUID();

    const client = await pool.connect();

    try {

        await client.query('BEGIN');
        await client.query('SET CONSTRAINTS ALL DEFERRED');

        await client.query(
            `INSERT INTO "change_log" (change_log_id, user_id, change_log_timestamp)
            VALUES ($1, $2, now());`,
            [changeLogId, userId]
        );

        const res = await client.query<UserRecord>(
            `INSERT INTO "user"
            (user_id, user_name, user_email, user_password, user_role, change_log_id, flag_deleted, history_id)
            VALUES ($1, $2, $3, $4, $5, $6, false, NULL)
            RETURNING
                user_id AS "userId",
                user_name AS "userName",
                user_email AS "email",
                user_role AS "userRole";`,
            [userId, name, email, password, role, changeLogId]
        );

        await client.query('COMMIT');
        return res.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

}