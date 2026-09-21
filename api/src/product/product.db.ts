import { randomUUID, type UUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";

export interface ProductRecord {
    productId: UUID,
    productName: string,
    productSku: UUID,
    productPrice: number,
    productQuantity: number;
}

const allowedFields = {
    name: "product_name",
    price: "product_price",
    quantity: "product_stock_quantity",
    sku: "product_sku",
    category_id: "category_id"
} as const;

type AllowedKeys = keyof typeof allowedFields;
type ProductUpdate = Partial<{
    name: string;
    price: number;
    quantity: number;
    sku: string,
    category_id: string
}>

export async function getAllProductsDb() {
    let query = `
        SELECT * FROM "product"
        WHERE (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query)).rows;
}

export async function getProductByIdDb(productId: string) {
    let query = `
        SELECT * FROM "product"
        WHERE product_id = $1 AND (flag_deleted = false);
    `;
    return (await pool.query(query, [productId])).rows[0];
}

export async function getProductsByNameOrSkuDb(value: string) {
    let query = `
        SELECT * FROM "product"
        WHERE (product_name ILIKE $1 OR product_sku ILIKE $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [`%${value}%`])).rows;
}

export async function getProductsByCategoryIdDb(id: string) {
    let query = `
        SELECT * FROM "product"
        WHERE category_id = $1 AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [id])).rows;
}

export async function getProductsWithinPriceRangeDb(minPrice: number, maxPrice: number) {
    let query = `
        SELECT * FROM "product"
        WHERE ($1 <= product_price AND product_price <= $2) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [minPrice, maxPrice])).rows;
}

export async function getProductsWithinStockDb() {
    let query = `
        SELECT * FROM "product"
        WHERE (history_id is NULL) AND (flag_deleted = false) AND product_stock_quantity > 0;
    `;
    return (await pool.query(query)).rows;
}

export async function getProductsOutOfStockDb() {
    let query = `
        SELECT * FROM "product"
        WHERE (history_id is NULL) AND (flag_deleted = false) AND product_stock_quantity = 0;
    `;
    return (await pool.query(query)).rows;
}

export async function addNewProductDb(productId: string, name: string, sku: string, price: number, quantity: number, category_id: string, userId: string, changeLogId: string): Promise<ProductRecord> {

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query('SET CONSTRAINTS ALL DEFERRED');

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
        await client?.query('ROLLBACK');
        throw error;
    } finally {
        client?.release();
    }

}

export async function deleteProductDb(product: any, userId: string, changeLogId: string) {

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        await client.query(`
                    UPDATE product
                    SET
                        flag_deleted = true,
                        change_log_id = $1
                    WHERE product_id = $2
                `, [changeLogId, product.product_id]);
        
        const historyProductId = randomUUID();

        await client.query(`
                INSERT INTO product (
                    product_id,
                    product_name,
                    product_sku,
                    product_price,
                    product_stock_quantity,
                    category_id,
                    flag_deleted,
                    history_id,
                    change_log_id
                ) VALUES ( $1, $2, $3, $4, $5, $6, false, $7, $8)
            `, [historyProductId,
            product.product_name,
            product.product_sku,
            product.product_price,
            product.product_stock_quantity,
            product.category_id,
            product.product_id,
            product.change_log_id
        ]);

        await client.query('COMMIT');

        return {
            deletedProductId: product.product_id,
            historyProductId,
            changeLogId
        };

    } catch (error) {
        await client?.query('ROLLBACK');
        throw error;
    } finally {
        client?.release();
    }
}

export async function updateProductDb(product: any, userId: string, updates: ProductUpdate, changeLogId: string) {

    const keys = (Object.keys(updates)).filter((key): key is AllowedKeys => {
        return Object.hasOwn(allowedFields, key) && (updates[key as AllowedKeys] !== undefined || updates[key as AllowedKeys] !== null)
    });

    if (keys.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    const values = [changeLogId, ...keys.map((k) => updates[k]), product.product_id];

    const setClause = [
        "change_log_id = $1",
        ...keys.map((k, i) => `${allowedFields[k]} = $${i + 2}`),
    ].join(", ");

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();


        const {
            rows: [updatedProduct],
        } = await client.query(
            `UPDATE product
             SET ${setClause}
             WHERE product_id = $${values.length}
             RETURNING *`,
            values
        );

        const historyProductId = randomUUID();

        await client.query(`
                INSERT INTO product (
                    product_id,
                    product_name,
                    product_sku,
                    product_price,
                    product_stock_quantity,
                    category_id,
                    flag_deleted,
                    history_id,
                    change_log_id
                ) VALUES ( $1, $2, $3, $4, $5, $6, false, $7, $8)
            `, [historyProductId,
            product.product_name,
            product.product_sku,
            product.product_price,
            product.product_stock_quantity,
            product.category_id,
            product.product_id,
            product.change_log_id
        ]);

        await client.query("COMMIT");

        return {
            product: updatedProduct,
            historyProductId,
            changeLogId,
        };

    } catch (error) {
        await client?.query("ROLLBACK");
        throw error;
    } finally {
        client?.release();
    }
}