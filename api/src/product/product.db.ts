import { randomUUID, type UUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";
import type { ValidRow } from "./product.service.js";
import { insertQueryBuilder, updateQueryBuilder } from "../../../db/querybuilder.js";

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

export async function addNewProductDb(name: string, sku: string, price: number, quantity: number, categoryId: string, changeLogId: string, historyId: any = null, client?: PoolClient) {

    const fieldObjects = [
        { "field": "product_name", "value": name },
        { "field": "product_sku", "value": sku },
        { "field": "product_price", "value": price },
        { "field": "product_stock_quantity", "value": quantity },
        { "field": "category_id", "value": categoryId },
        { "field": "change_log_id", "value": changeLogId },
        { "field": "history_id", "value": historyId },
        { "field": "flag_deleted", "value": false }
    ];

    const { sql, values } = insertQueryBuilder("product", fieldObjects, [], true);
    return client ? await client.query(sql, values) : await pool.query(sql, values);
}

export async function deleteProductDb(client: PoolClient, product: any, changeLogId: string) {

    const fieldObjects = [
        { "field": "flag_deleted", "value": true },
        { "field": "change_log_id", "value": changeLogId }
    ]

    const { sql, values } = updateQueryBuilder("product", fieldObjects, product.product_id, []);
    await client.query(sql, values);

    await addNewProductDb(
        product.product_name,
        product.product_sku,
        product.product_price,
        product.product_stock_quantity,
        product.category_id,
        changeLogId,
        product.product_id,   // history_id
        client
    );

    return { "deleted product id": product.product_id, changeLogId };
}

export async function updateProductDb(client: PoolClient, product: any, rows: { field: string; value: unknown }[], changeLogId: string) {

    const { sql, values } = updateQueryBuilder(
        "product",
        [{ field: "change_log_id", value: changeLogId }, ...rows],
        product.product_id,
        [],
        true // RETURNING *
    );

    const {
        rows: [updatedProduct],
    } = await client.query(sql, values);

    await addNewProductDb(
        product.product_name,
        product.product_sku,
        product.product_price,
        product.product_stock_quantity,
        product.category_id,
        changeLogId,
        product.product_id,   // history_id
        client
    );

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