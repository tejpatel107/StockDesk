import { pool } from "../../../db/db.js";

export async function getProductsAtOrBelowStockLevelDb(threshold: number) {
    const query = `
        SELECT * FROM "product"
        WHERE (product_stock_quantity <= $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [threshold])).rows;
}

export async function getSalesSummaryDb(whereClause: string, values: string[]) {

    const query = `
        SELECT
            COUNT(*)                                AS total_orders,
            SUM(o.order_total_amount)               AS total_revenue,
            ROUND(AVG(o.order_total_amount),2)      AS average_order_value
        FROM "order" o
        WHERE ${whereClause}
            AND (o.order_status = 'SHIPPED' OR o.order_status = 'DELIVERED')
            AND (o.history_id IS NULL AND o.flag_deleted = false);
    `;

    return await pool.query(query, values);
}

export async function getBestSellingProductsDb(limit: number) {
    let query = `
        SELECT * FROM "product"
        WHERE (product_stock_quantity <= $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [limit])).rows;
}

export async function getTopSellingProductsByQuantitiesSoldDb(limit: number) {
    const query = `
        SELECT
            p.product_id,
            p.product_name,
            SUM(oi.order_item_quantity) AS total_quantity_sold
        FROM order_item oi
        JOIN "order" o ON o.order_id = oi.order_id 
          AND o.order_status IN ('DELIVERED', 'SHIPPED')
          AND o.history_id IS NULL
          AND o.flag_deleted = false
        JOIN product p ON p.product_id = oi.product_id 
        GROUP BY p.product_id, p.product_name
        ORDER BY total_quantity_sold DESC, p.product_name ASC
        LIMIT $1;
    `;
    return (await pool.query(query, [limit])).rows;
}