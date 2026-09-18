import { randomUUID, type UUID } from "node:crypto";
import { pool } from "../../../db/db.js";

export interface ProductRecord {
    productId: UUID,
    productName: string,
    productSku: UUID,
    productPrice: number,
    productQuantity: number;
}

export async function getAllProductsDb() {
    let query = `
        SELECT * FROM "product";
    `;
    return (await pool.query(query)).rows;
}

export async function getProductsByNameOrSkuDb(value: string) {
    let query = `
        SELECT * FROM "product"
        WHERE product_name ILIKE $1 OR product_sku ILIKE $1;
    `;
    return (await pool.query(query, [`%${value}%`])).rows;
}

export async function getProductsByCategoryIdDb(id: string) {
    let query = `
        SELECT * FROM "product"
        WHERE category_id = $1;
    `;
    return (await pool.query(query, [id])).rows;
}

export async function getProductsWithinPriceRangeDb(minPrice: number, maxPrice: number) {
    let query = `
        SELECT * FROM "product"
        WHERE $1 > product_price AND product_price < $2;
    `;
    return (await pool.query(query, [minPrice, maxPrice])).rows;
}

export async function getProductsWithinStockDb() {
    let query = `
        SELECT * FROM "product"
        WHERE product_stock_quantity > 0;
    `;
    return (await pool.query(query)).rows;
}

export async function getProductsOutOfStockDb() {
    let query = `
        SELECT * FROM "product"
        WHERE product_stock_quantity = 0;
    `;
    return (await pool.query(query)).rows;
}

export async function addNewProductDb(name: string, price: number, quantity: number, category_id: string, userId: string): Promise<ProductRecord> {

    const productId = randomUUID();
    const sku = randomUUID();
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

        const res = await client.query<ProductRecord>(
            `INSERT INTO "product"
                (product_id, 
                product_name, 
                product_sku, 
                product_price, 
                product_stock_quantity,
                category_id, 
                flag_deleted, 
                change_log_id, 
                history_id)
                VALUES ($1, $2, $3, $4, $5, $6, false, $7, NULL)
                RETURNING
                    product_id AS "productId",
                    product_name AS "productName",
                    product_sku AS "productSku",
                    product_price AS "productPrice",
                    product_stock_quantity AS "productQuantity";`,
            [productId, name, sku, price, quantity, category_id, changeLogId]
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

export async function deleteProductDb(productId:string, userId: string) {

    const changeLogId = randomUUID();
    const historyProductId = randomUUID();
    const client = await pool.connect();

    try {

        await client.query('BEGIN');
        // await client.query('SET CONSTRAINTS ALL DEFERRED');

        await client.query(
            `INSERT INTO "change_log" (change_log_id, user_id, change_log_timestamp)
                VALUES ($1, $2, now());`,
            [changeLogId, userId]
        );

        await client.query (`
            UPDATE FROM "product"
            WHERE "product_id" = $1;
        `);
    } catch (error) {

    }
    return (await pool.query(query, [productId])).rows;
}