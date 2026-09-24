import { pool } from "../../../db/db.js";


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
    ORDER BY os.order_date ${sortDirection}, os.order_id
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  // console.log(query)

  return (await pool.query(query, params));
}

export async function getOrderByIdDb(id: string) {

}