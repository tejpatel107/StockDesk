import { randomUUID, type UUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";
import type { ValidRow } from "./product.service.js";

export async function getAllProductsDb(pageSize: number, offset: number) {
    const query = `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM "product"
        WHERE (history_id IS NULL) AND (flag_deleted = false)
        ORDER BY product_name, product_id
        LIMIT $1 OFFSET $2;
    `;
    return await pool.query(query, [pageSize, offset]);
}

export async function getProductByIdDb(productId: string) {
    const query = `
        SELECT 
            *
        FROM "product"
        WHERE product_id = $1 AND flag_deleted = false AND history_id IS NULL;
    `;
    return (await pool.query(query, [productId]));
}

export async function getProductsByNameOrSkuDb(value: string, pageSize: number, offset: number) {
    const query = `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM "product"
        WHERE (product_name ILIKE $1 OR product_sku ILIKE $1)
          AND (history_id IS NULL) AND (flag_deleted = false)
        ORDER BY product_name, product_id
        LIMIT $2 OFFSET $3;
    `;
    return await pool.query(query, [`%${value}%`, pageSize, offset]);
}

export async function getProductByNameDb(value: string) {
    const query = `
        SELECT * FROM "product"
        WHERE (product_name = $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [value]));
}

export async function getProductBySkuDb(value: string) {
    const query = `
        SELECT * FROM "product"
        WHERE (product_sku = $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [value]));
}

export async function getProductsByCategoryIdDb(id: string, pageSize: number, offset: number) {
    const query = `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM "product"
        WHERE category_id = $1 AND (history_id IS NULL) AND (flag_deleted = false)
        ORDER BY product_name, product_id
        LIMIT $2 OFFSET $3;
    `;
    return await pool.query(query, [id, pageSize, offset]);
}

export async function getProductsWithinPriceRangeDb(pageSize: number, offset: number, minPrice: number = 0, maxPrice: number = Infinity) {
    const query = `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM "product"
        WHERE ($1 <= product_price AND product_price <= $2)
          AND (history_id IS NULL) AND (flag_deleted = false)
        ORDER BY product_price, product_id
        LIMIT $3 OFFSET $4;
    `;
    return await pool.query(query, [minPrice, maxPrice, pageSize, offset]);
}

export async function getProductsWithinStockDb(pageSize: number, offset: number) {
    const query = `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM "product"
        WHERE (history_id IS NULL) AND (flag_deleted = false) AND product_stock_quantity > 0
        ORDER BY product_name, product_id
        LIMIT $1 OFFSET $2;
    `;
    return await pool.query(query, [pageSize, offset]);
}

export async function getProductsOutOfStockDb(pageSize: number, offset: number) {
    const query = `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM "product"
        WHERE (history_id IS NULL) AND (flag_deleted = false) AND product_stock_quantity = 0
        ORDER BY product_name, product_id
        LIMIT $1 OFFSET $2;
    `;
    return await pool.query(query, [pageSize, offset]);
}

export async function addNewProductDb(name: string, sku: string, price: number, quantity: number, category_id: string, changeLogId: string) {

    return await pool.query(
        `INSERT INTO "product"
                (product_name, 
                product_sku, 
                product_price, 
                product_stock_quantity,
                category_id, 
                flag_deleted, 
                change_log_id, 
                history_id)
                VALUES ($1, $2, $3, $4, $5, false, $6, NULL)
                RETURNING
                    product_id AS "productId",
                    product_name AS "productName",
                    product_sku AS "productSku",
                    product_price AS "productPrice",
                    product_stock_quantity AS "productQuantity";`,
        [name, sku, price, quantity, category_id, changeLogId]
    );
}

export async function deleteProductDb(client: PoolClient, product: any, changeLogId: string) {

    await client.query(`
                    UPDATE product
                    SET
                        flag_deleted = true,
                        change_log_id = $1
                    WHERE product_id = $2
                `, [changeLogId, product.product_id]);

    await client.query(`
                INSERT INTO product (
                    product_name,
                    product_sku,
                    product_price,
                    product_stock_quantity,
                    category_id,
                    flag_deleted,
                    history_id,
                    change_log_id
                ) VALUES ( $1, $2, $3, $4, $5, false, $6, $7)
            `, [product.product_name,
    product.product_sku,
    product.product_price,
    product.product_stock_quantity,
    product.category_id,
    product.product_id,
    product.change_log_id
    ]);

    return {
        "deleted product id": product.product_id,
        changeLogId
    };
}

export async function updateProductDb(client: PoolClient, product: any, setClause: string, values: string[], changeLogId: string) {

    const {
        rows: [updatedProduct],
    } = await client.query(
        `UPDATE product
             SET ${setClause}
             WHERE product_id = $${values.length}
             RETURNING *`,
        values
    );

    await client.query(`
                INSERT INTO product (
                    product_name,
                    product_sku,
                    product_price,
                    product_stock_quantity,
                    category_id,
                    flag_deleted,
                    history_id,
                    change_log_id
                ) VALUES ( $1, $2, $3, $4, $5, false, $6, $7)
            `, [product.product_name,
    product.product_sku,
    product.product_price,
    product.product_stock_quantity,
    product.category_id,
    product.product_id,
    product.change_log_id
    ]);

    return {
        product: updatedProduct,
        changeLogId,
    };
}

export async function getProductsBySkuIfExistDb(client: PoolClient, skus: string[]) {

    return client.query(
        `SELECT product_sku FROM product
              WHERE product_sku = ANY($1::text[])
                AND history_id IS NULL AND flag_deleted = false`,
        [skus]
    );
}

export async function getProductsByCatgoryIdsDb(client: PoolClient, categoryIds: string[]) {

    return client.query(
        `SELECT category_id FROM product
              WHERE category_id = ANY($1::uuid[])
                AND history_id IS NULL AND flag_deleted = false`,
        [categoryIds]
    );
}

export async function addProductsInBulkDb(client: PoolClient, rowsToInsert: ValidRow[], userId: string) {

    const { rows: [changeLog] } = await client.query(`
                                        INSERT INTO change_log (
                                            change_log_id,
                                            user_id,
                                            change_log_timestamp
                                        ) VALUES ($1, $2, now())
                                        RETURNING change_log_id           
                                        `, [randomUUID(), userId]);

    const rows = await client.query(
        `INSERT INTO product
               (product_name, product_sku, product_price,
                product_stock_quantity, category_id, flag_deleted, history_id, change_log_id)
             SELECT t.name, t.sku, t.price, t.qty, t.cat, false, NULL, $6::uuid
               FROM unnest($1::text[], $2::text[], $3::numeric[], $4::int[], $5::uuid[])
                    AS t(name, sku, price, qty, cat)`,
        [
            rowsToInsert.map((r) => r.name),
            rowsToInsert.map((r) => r.sku),
            rowsToInsert.map((r) => r.price),
            rowsToInsert.map((r) => r.quantity),
            rowsToInsert.map((r) => r.categoryId),
            changeLog.change_log_id,
        ]
    );

    return rows.rowCount ?? 0;
}