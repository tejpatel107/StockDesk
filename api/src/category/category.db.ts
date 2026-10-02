import { randomUUID, type UUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";

export async function getAllCategoriesDb() {
    let query = `
        SELECT * FROM "category"
        WHERE (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query));
}

export async function getCategoryByIdDb(categoryId: string) {
    let query = `
        SELECT * FROM "category"
        WHERE category_id = $1 AND (flag_deleted = false);
    `;
    return (await pool.query(query, [categoryId]));
}

export async function getCategoryByNameDb(value: string) {
    let query = `
        SELECT 
            category_id AS id,
            category_name AS name,
            category_description AS description 
        FROM "category"
        WHERE (category_name = $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [value]));
}

export async function addNewCategoryDb(name: string, description: string, userId: string, changeLogId: string) {

    return await pool.query(
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
                    category_description AS "categoryDescription";`,
        [name, description, changeLogId]
    );
}

export async function deleteCategoryDb(client: PoolClient, category: any, changeLogId: string) {

    await client.query(`
                    UPDATE "category"
                    SET
                        flag_deleted = true,
                        change_log_id = $1
                    WHERE category_id = $2
                `, [changeLogId, category.category_id]);

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
                    category_description AS "categoryDescription";`,
        [category.category_name, category.category_description, category.change_log_id, category.category_id]
    );

    return {
        deletedCategoryId: category.category_id,
        changeLogId
    };
}

export async function updateCategoryDb(client: PoolClient, category: any, setClause : string, values: string[]) {


    const {
        rows: [updatedCategory],
    } = await client.query(
        `UPDATE category
             SET ${setClause}
             WHERE category_id = $${values.length}
             RETURNING *`,
        values
    );

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
                    category_description AS "categoryDescription";`,
        [category.category_name, category.category_description, category.change_log_id, category.category_id]
    );

    return updatedCategory;
}