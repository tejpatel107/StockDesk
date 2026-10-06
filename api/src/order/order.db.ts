import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";
import type { ORDER_STATUSES } from "../../validators/order.validation.js";
import { insertQueryBuilder, updateQueryBuilder } from "../../../db/querybuilder.js";


export interface OrderFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface OrderRow {
  order_id: string;
  order_date: string;
  order_created_at: string;
  order_status: string;
  order_total_amount: string;
  customer_name: string;
  item_count: string;
}

export async function getOrdersDb(params: any[], whereClause: string, limitIndex: number, offsetIndex: number, sortDirection: string) {

  const query = `
    WITH customer_name AS (
      SELECT  c.customer_id, u.user_name AS customer_name
      FROM "customer" c
      LEFT JOIN "user" u ON u.user_id = c.user_id
      WHERE (c.history_id IS NULL AND c.flag_deleted = false)
        AND (u.history_id IS NULL AND u.flag_deleted = false)
    ),
    order_summary AS (
      SELECT
        o.order_id,
        o.customer_id,
        o.order_date,
        o.order_status,
        o.order_total_amount,
        COUNT(oi.order_item_id)::int AS order_item_count
      FROM "order" o
      LEFT JOIN "order_item" oi ON oi.order_id = o.order_id
      WHERE ${whereClause}
      GROUP BY o.order_id
    )
    SELECT
      os.order_id,
      cn.customer_name,
      os.order_date,
      os.order_status,
      os.order_total_amount,
      os.order_item_count,
      COUNT(*) OVER()::int AS total_number_of_orders
    FROM "order_summary" os 
    LEFT JOIN "customer_name" cn ON cn.customer_id = os.customer_id
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;
  return (await pool.query(query, params));

}

export async function getOrderByIdDb(orderId: string) {
  const query = `
    WITH order_summary AS (
      SELECT 
        *
      FROM "order" o 
      WHERE (o.history_id IS NULL) AND (o.flag_deleted = false) AND (o.order_id = $1)
    ),
    order_item_summary AS (
      SELECT 
        os.order_id,
        os.customer_id,
        oi.order_item_id,
        oi.product_id AS "productId",
        os.order_date,
        os.order_created_at,
        os.order_status,
        os.order_total_amount,
        oi.order_item_quantity AS "quantity",
        os.history_id,
        os.change_log_id,
        os.flag_deleted
      FROM "order_summary" os
      LEFT JOIN "order_item" oi ON os.order_id = oi.order_id
    )
    SELECT * FROM order_item_summary;
  `;

  return await pool.query(query, [orderId]);
}

export async function getOrderByIdForStaffDb(orderId: string) {

  const query = `
    SELECT
      o.order_id,
      u.user_name AS customer_name,
      o.order_date,
      o.order_status,
      o.order_total_amount,
      oi.order_item_id,
      p.product_id,
      p.product_name,
      oi.order_item_unit_price_at_time_of_order,
      oi.order_item_line_total,
      oi.order_item_quantity
    FROM "order" o
    LEFT JOIN "customer" c
      ON c.customer_id = o.customer_id
      AND c.history_id IS NULL
    LEFT JOIN "user" u
      ON u.user_id = c.user_id
      AND u.history_id IS NULL
    LEFT JOIN "order_item" oi
      ON oi.order_id = o.order_id
    LEFT JOIN "product" p
      ON p.product_id = oi.product_id
      AND p.history_id IS NULL
    WHERE o.order_id = $1
      AND o.history_id IS NULL
      AND o.flag_deleted = false;
  `;
  return await pool.query(query, [orderId]);
}

export async function getOrderByIdForCustomerDb(userId: string, orderId: string) {
  const query = `
    WITH user_summary AS (
      SELECT user_id, user_name FROM "user"
      WHERE user_id = $1
    ),
    customer_summary AS (
      SELECT c.customer_id, us.user_name AS customer_name
      FROM user_summary us 
      LEFT JOIN "customer" c ON us.user_id = c.user_id AND (c.history_id IS NULL AND c.flag_deleted = false)
    ),
    order_summary AS (
      SELECT 
        o.order_id,
        cs.customer_name,
        o.order_date,
        o.order_status,
        o.order_total_amount
      FROM customer_summary AS cs 
      LEFT JOIN "order" o ON o.customer_id = cs.customer_id
      WHERE (o.history_id IS NULL) AND (o.flag_deleted = false) AND (o.order_id = $2)
    ),
    order_item_summary AS (
      SELECT 
        os.order_id,
        oi.order_item_id,
        oi.product_id,
        os.customer_name,
        os.order_date,
        os.order_status,
        os.order_total_amount,
        oi.order_item_unit_price_at_time_of_order,
        oi.order_item_line_total,
        oi.order_item_quantity
      FROM "order_summary" os
      LEFT JOIN "order_item" oi ON os.order_id = oi.order_id
    ),
    order_item_product_summary AS (
      SELECT
        ois.order_id,
        ois.customer_name,
        ois.order_item_id,
        p.product_id,
        ois.order_date,
        ois.order_status,
        ois.order_total_amount,
        p.product_name,
        ois.order_item_unit_price_at_time_of_order,
        ois.order_item_line_total,
        ois.order_item_quantity       
      FROM "order_item_summary" ois  
      LEFT JOIN "product" p ON ois.product_id = p.product_id AND (p.history_id IS NULL) 
    )
    SELECT * FROM order_item_product_summary;
  `;
  return await pool.query(query, [userId, orderId]);
}

export async function getProductsDb(client: PoolClient, productIds: string[]) {
  const query = `
        SELECT 
            product_id,
            product_name,
            product_sku,
            product_price,
            product_stock_quantity AS product_quantity,
            category_id,
            flag_deleted,
            change_log_id
        FROM "product"
        WHERE product_id = ANY($1::uuid[]) AND flag_deleted = false AND history_id IS NULL
        FOR UPDATE;
    `;
  return client.query(query, [productIds]);
}

export async function createNewOrderDb(client: PoolClient, customerId: string, status: ORDER_STATUSES, orderTotal: number, changeLogId: string, historyId: any = null, flag_deleted = false) {

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; // YYYY-MM-DD (local)
  const orderTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`; // HH:MM:SS (local)

  const fieldObjects = [
    { "field": "customer_id", "value": customerId },
    { "field": "order_date", "value": orderDate },
    { "field": "order_created_at", "value": orderTime },
    { "field": "order_status", "value": status },
    { "field": "order_total_amount", "value": orderTotal },
    { "field": "change_log_id", "value": changeLogId },
    { "field": "history_id", "value": historyId },
    { "field": "flag_deleted", "value": flag_deleted }
  ];

  const { sql, values } = insertQueryBuilder("order", fieldObjects, [], true);
  console.log(sql)
  return client ? await client.query(sql, values) : await pool.query(sql, values);
}

export async function addOrderItemsDb(
  client: PoolClient,
  orderId: string,
  products: any[],
  itemsMap: Map<any, any>,
  lineTotals: number[]
) {
  const orderIds: string[] = [];
  const productIds: string[] = [];
  const quantities: number[] = [];
  const unitPrices: number[] = [];

  products.forEach((product, i) => {
    orderIds.push(orderId);
    productIds.push(product.product_id);
    quantities.push(itemsMap.get(product.product_id));
    unitPrices.push(product.product_price);
  });

  const query = `
        INSERT INTO order_item (
            order_id, product_id,
            order_item_quantity, order_item_unit_price_at_time_of_order,
            order_item_line_total
        )
        SELECT * FROM UNNEST(
            $1::uuid[], $2::uuid[], $3::int[], $4::numeric[], $5::numeric[]
        );
  `;

  await client.query(query, [orderIds, productIds, quantities, unitPrices, lineTotals]
  );
}

export async function updateProductQuantityDb(client: PoolClient, changeLogId: string, products: any[], itemsMap: Map<string, number>) {  // productId -> new stock quantity {
  const productIds = Array.from(itemsMap.keys());

  for (const product of products) {
    const { sql, values } = insertQueryBuilder("product", [
      { field: "product_name", value: product.product_name },
      { field: "product_sku", value: product.product_sku },
      { field: "product_price", value: product.product_price },
      { field: "product_stock_quantity", value: product.product_quantity },
      { field: "category_id", value: product.category_id },
      { field: "flag_deleted", value: product.flag_deleted },
      { field: "history_id", value: product.product_id },
      { field: "change_log_id", value: product.change_log_id },
    ]);
    await client.query(sql, values);
  }

  const updated: Record<string, unknown>[] = [];

  // 2. Update the live row
  for (const [productId, quantity] of itemsMap) {
    const { sql, values } = updateQueryBuilder(
      "product",
      [
        { field: "product_stock_quantity", value: quantity },
        { field: "change_log_id", value: changeLogId },
      ],
      productId,
      ["product_id", "product_stock_quantity"]
    );
    const { rows } = await client.query(sql, values);
    updated.push(...rows);
  }

  return updated;
}

export async function changeOrderStatusDb(client: PoolClient, order: any, changeLogId: string, status: ORDER_STATUSES) {

  const { sql, values } = updateQueryBuilder("order",
    [{ "field": "order_status", "value": status },
    { "field": "change_log_id", "value": changeLogId }],
    order.order_id, [], true);

  const res = await client.query(sql, values);

  const fieldObjects = [
    { "field": "customer_id", "value": order.customer_id },
    { "field": "order_date", "value": order.order_date },
    { "field": "order_created_at", "value": order.order_created_at },
    { "field": "order_status", "value": order.order_status },
    { "field": "order_total_amount", "value": order.order_total_amount },
    { "field": "change_log_id", "value": changeLogId },
    { "field": "history_id", "value": order.order_id },
    { "field": "flag_deleted", "value": order.flag_deleted }
  ];

  const { sql : insertQuery, values : insertQueryValues } = insertQueryBuilder("order", fieldObjects, [], true);
  await client.query(insertQuery, insertQueryValues);

  return res;

} 