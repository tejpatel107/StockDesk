import { pool } from "../../../db/db.js";


export async function getProductsAtOrBelowStockLevelDb(threshold : number) {
    let query = `
        SELECT * FROM "product"
        WHERE (product_stock_quantity <= $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [threshold])).rows;
}

export async function getBestSellingProductsDb(limit : number) {
    let query = `
        SELECT * FROM "product"
        WHERE (product_stock_quantity <= $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [limit])).rows;
}