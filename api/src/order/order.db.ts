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

const WHERE_CLAUSE = `
  WHERE o.flag_deleted = false
    AND ($1::varchar IS NULL OR o.order_status = $1)
    AND ($2::date IS NULL OR o.order_date >= $2)
    AND ($3::date IS NULL OR o.order_date <= $3)
`;

function filterParams(filters: OrderFilters): [string | null, string | null, string | null] {
  return [filters.status ?? null, filters.startDate ?? null, filters.endDate ?? null];
}

export async function countOrders(filters: OrderFilters): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) AS total FROM "order" o ${WHERE_CLAUSE}`,
    filterParams(filters)
  );
  return parseInt(result.rows[0].total, 10);
}

export async function findOrders(
  filters: OrderFilters,
  limit: number,
  offset: number
): Promise<OrderRow[]> {
  const result = await pool.query<OrderRow>(
    `
    SELECT
      o.order_id,
      o.order_date,
      o.order_created_at,
      o.order_status,
      o.order_total_amount,
      u.user_name AS customer_name,
      COUNT(oi.order_item_id) AS item_count
    FROM "order" o
    JOIN customer c ON o.customer_id = c.customer_id
    JOIN "user" u ON c.user_id = u.user_id
    LEFT JOIN order_item oi ON oi.order_id = o.order_id
    ${WHERE_CLAUSE}
    GROUP BY o.order_id, u.user_name
    ORDER BY o.order_date DESC, o.order_created_at DESC
    LIMIT $4 OFFSET $5
    `,
    [...filterParams(filters), limit, offset]
  );
  return result.rows;
}