

/*
    `INSERT INTO "user"
            (user_name, user_email, user_password, user_role, change_log_id, flag_deleted, history_id)
            VALUES ($1, $2, $3, $4, $5, false, NULL)
            RETURNING
                user_id AS "userId",
                user_name AS "userName",
                user_email AS "email",
                user_role AS "userRole",
                change_log_id AS "changeLogId";`
*/

export function insertQueryBuilder(table: string, rows: Record<string, unknown>[], returning: string[] = [], returnAll = false) {
    const columns = rows.map(row => row.field);
    const values = rows.map(row => row.value ?? null);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    let sql = `INSERT INTO "${table}" (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;

    if (returnAll) sql += " RETURNING *";
    else if (returning.length) sql += ` RETURNING ${returning.join(", ")}`;

    return { sql, values };
}

export function updateQueryBuilder(table: string, rows: Record<string, unknown>[], id: string, returning: string[] = [], returnAll = false) {
    const columns = rows.map(row => row.field);
    const values = rows.map(row => row.value);

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`);
    values.push(id);

    let sql = `UPDATE "${table}" SET ${setClause.join(", ")} WHERE ${table}_id = $${values.length}`;

    if (returnAll) sql += " RETURNING *";
    else if (returning.length) sql += ` RETURNING ${returning.join(", ")}`;

    return { sql, values };
}