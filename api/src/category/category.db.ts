import { randomUUID, type UUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";

const allowedFields = {
    name: "category_name",
    description: "category_description"
} as const;

type AllowedKeys = keyof typeof allowedFields;
type CategoryUpdate = Partial<{
    name: string,
    description: string
}>

export async function getAllCategoriesDb() {
    let query = `
        SELECT * FROM "category"
        WHERE (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query)).rows;
}

export async function getCategoryByIdDb(categotyId: string) {
    let query = `
        SELECT * FROM "category"
        WHERE category_id = $1 AND (flag_deleted = false);
    `;
    return (await pool.query(query, [categotyId])).rows[0];
}

export async function getCategoryByNameDb(value: string) {
    let query = `
        SELECT * FROM "category"
        WHERE (category_name ILIKE $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [`%${value}%`])).rows;
}

export async function addNewCategoryDb(categoryId: string, name: string, description: string, userId: string, changeLogId: string) {

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const res = await client.query(
            `INSERT INTO "category"
                (category_name, 
                category_description,
                flag_deleted, 
                change_log_id, 
                history_id)
                VALUES ($1, $2, false, $3, NULL)
                RETURNING
                    category_id AS "categoryId",
                    category_name AS "categoryName",
                    category_description AS "cetgoryDescription";`,
            [name, description, changeLogId]
        );

        await client.query('COMMIT');
        return res.rows[0];

    } catch (error) {
        await client?.query('ROLLBACK');
        throw error;
    } finally {
        client?.release();
    }

}

export async function deleteCategoryDb(category: any, userId: string, changeLogId: string) {

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        await client.query(`
                    UPDATE "category"
                    SET
                        flag_deleted = true,
                        change_log_id = $1
                    WHERE category_id = $2
                `, [changeLogId, category.category_id]);

        // const historyCategoryId = randomUUID();

        await client.query(
            `INSERT INTO "category"
                (category_name, 
                category_description,
                flag_deleted, 
                change_log_id, 
                history_id)
                VALUES ($1, $2,false, $3, $4)
                RETURNING
                    category_id AS "categoryId",
                    category_name AS "categoryName",
                    category_description AS "cetgoryDescription";`,
            [category.category_name, category.category_description, category.change_log_id, category.category_id]
        );

        await client.query('COMMIT');

        return {
            deletedCategoryId: category.category_id,
            // historyCategoryId,
            changeLogId
        };

    } catch (error) {
        await client?.query('ROLLBACK');
        throw error;
    } finally {
        client?.release();
    }
}

export async function updateCategoryDb(category: any, userId: string, updates: CategoryUpdate, changeLogId: string) {

    const keys = (Object.keys(updates)).filter((key): key is AllowedKeys => {
        return Object.hasOwn(allowedFields, key) && (updates[key as AllowedKeys] !== undefined || updates[key as AllowedKeys] !== null)
    });

    if (keys.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    const values = [changeLogId, ...keys.map((k) => updates[k]), category.category_id];
    console.log(values);

    const setClause = [
        "change_log_id = $1",
        ...keys.map((k, i) => `${allowedFields[k]} = $${i + 2}`),
    ].join(", ");
    console.log(setClause);

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();

        const {
            rows: [updatedCategory],
        } = await client.query(
            `UPDATE category
             SET ${setClause}
             WHERE category_id = $${values.length}
             RETURNING *`,
            values
        );

        const historyCategoryId = randomUUID();

        await client.query(
            `INSERT INTO "category"
                (category_name, 
                category_description,
                flag_deleted, 
                change_log_id, 
                history_id)
                VALUES ($1, $2, false, $3, $4)
                RETURNING
                    category_id AS "categoryId",
                    category_name AS "categoryName",
                    category_description AS "cetgoryDescription";`,
            [category.category_name, category.category_description, category.change_log_id, category.category_id]
        );

        await client.query("COMMIT");

        return updatedCategory;

    } catch (error) {
        await client?.query("ROLLBACK");
        throw error;
    } finally {
        client?.release();
    }
}