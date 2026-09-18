import { randomUUID } from "crypto";
import { pool } from "../../../db/db.js";

async function getAllProducts() {
    let query = `
        SELECT * FROM "product";
    `;
    return (await pool.query(query)).rows;
}

async function getProductByNameOrSku(value: string) {
    let query = `
        SELECT * FROM "product"
        WHERE productName LIKE $1 OR productSku LIKE %$1%
        LIMIT 1;
    `;
    return (await pool.query(query, [`%${value}%`])).rows[0];
}

async function getProductByCategoryId(id: string) {
    let query = `
        SELECT * FROM "product"
        WHERE category_id = $1;
    `;
    return (await pool.query(query, [id])).rows;
}

export default {
    getAllProducts,
    getProductByNameOrSku,
    getProductByCategoryId
}