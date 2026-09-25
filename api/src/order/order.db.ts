import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";
import type { ORDER_STATUSES } from "../../validators/order.validation.js";


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

export async function getOrderByIdDb(userId: string, orderId: string) {
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
      FROM "order" o
      LEFT JOIN customer_summary AS cs ON o.customer_id = cs.customer_id
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
        os.order_total_amount
      FROM "order_summary" os
      LEFT JOIN "order_item" oi ON os.order_id = oi.order_id
    ),
    order_item_product_summary AS (
      SELECT
        ois.order_id,
        ois.customer_name,
        ois.order_date,
        ois.order_status,
        ois.order_total_amount,
        ois.order_item_id,
        p.product_name AS product_name
      FROM "order_item_summary" ois  
      LEFT JOIN "product" p ON ois.product_id = p.product_id 
        AND (p.history_id IS NULL) AND (p.flag_deleted = false)
    )
    SELECT * FROM order_item_product_summary;
  `;
  return await pool.query(query, [userId, orderId]);
}

export async function createNewOrderDb(
  client: PoolClient,
  customerId: string,
  status: ORDER_STATUSES,
  orderTotal: number,
  changeLogId: string
) {

  const query = `
    INSERT INTO "order" (
      customer_id,
      order_status,
      order_total_amount,
      flag_deleted,
      history_id,
      change_log_id
    ) VALUES ($1, $2, $3, false, NULL, $4)
     RETURNING order_id AS "orderId";`;

  return client.query(query, [customerId, status, orderTotal, changeLogId])

}

export async function addOrderItems(
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

export async function updateProductQuantityDb(
  client: PoolClient, changeLogId: string, products: any[], itemsMap: Map<any, any>) {

  const productIds: string[] = [];
  const quantities: number[] = [];

  products.forEach((product) => {
    productIds.push(product.product_id);
    quantities.push(itemsMap.get(product.product_id));
  });

  // Lock the rows we're about to touch so concurrent orders can't race on the same product
  await client.query(
    `SELECT product_id FROM product WHERE product_id = ANY($1::uuid[]) FOR UPDATE`,
    [productIds]
  );

  await client.query(
    `INSERT INTO product (
       product_name, 
       product_sku, 
       product_price,
       product_stock_quantity, 
       category_id, 
       flag_deleted,
       history_id, 
       change_log_id
     )
     SELECT product_name, product_sku, product_price,
            product_stock_quantity, category_id, flag_deleted,
            product_id, change_log_id
     FROM product
     WHERE product_id = ANY($1::uuid[])`,
    [productIds]
  );

  const query = `
    UPDATE product AS p
    SET product_stock_quantity = p.product_stock_quantity - u.quantity, change_log_id = $3
    FROM UNNEST(
      $1::uuid[], $2::int[]
    ) AS u(product_id, quantity)
    WHERE p.product_id = u.product_id 
      AND p.product_stock_quantity >= u.quantity;
  `;

  return await client.query(query, [productIds, quantities, changeLogId]);
}