import { randomUUID, type UUID } from "node:crypto";
import { pool } from "../../../db/db.js";
import type { ROLES } from "../../../db/roles.js";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import type { PoolClient } from "pg";

export async function getUserByEmailDb(email: string): Promise<UserRecord | undefined> {
    let query = `
        SELECT user_email AS email, 
               user_password AS "password",
               user_id AS "id",
               user_role AS "role"
               FROM "user" WHERE user_email = $1;`;

    try {
        return (await pool.query(query, [email])).rows[0];
    } catch (error) {
        throw error;
    }
}

export async function getUserByIdDb(userId: string) {
    let query = `
        SELECT * FROM "user" 
        WHERE user_id = $1 AND flag_deleted = false;
    `
    return (await pool.query(query, [userId])).rows[0];
}

export async function addNewUserDb(client: PoolClient, name: string, email: string, password: string, role: ROLES, changeLogId: string) {

    return await client.query(
        `INSERT INTO "user"
            (user_name, user_email, user_password, user_role, change_log_id, flag_deleted, history_id)
            VALUES ($1, $2, $3, $4, $5, false, NULL)
            RETURNING
                user_id AS "userId",
                user_name AS "userName",
                user_email AS "email",
                user_role AS "userRole",
                change_log_id AS "changeLogId";`,
        [name, email, password, role, changeLogId]
    );
}