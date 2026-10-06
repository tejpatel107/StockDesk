import { pool } from "./db.js";
import type { PoolClient } from "pg";
import { insertQueryBuilder } from "./querybuilder.js";

export async function insertNewChangeLogRecord(userId: string, client?: PoolClient) {

    const fieldObjects = [
        { "field" : "user_id", "value" : userId },
        { "field" : "change_log_timestamp", "value" : new Date() }
    ]

    const { sql, values } = insertQueryBuilder("change_log", fieldObjects, [], true);
    return client ? client.query(sql, values) : await pool.query(sql, values);    
}