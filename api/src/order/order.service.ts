import { countOrders, findOrders, OrderFilters } from "../db/orders.queries.js";
import { getOrdersQuerySchema } from "../schemas/orders.schema.js";

export class ValidationError extends Error {
    details: unknown;

    constructor(details: unknown) {
        super("invalid query params");
        this.name = "ValidationError";
        this.details = details;
    }
}

export interface OrderDTO {
    orderId: string;
    orderDate: string;
    orderCreatedAt: string;
    status: string;
    totalAmount: string;
    customerName: string;
    itemCount: number;
}

export interface PaginatedOrders {
    orders: OrderDTO[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export async function getOrders(rawQuery: unknown): Promise<PaginatedOrders | any> {

    try {
        const parsed = getOrdersQuerySchema.safeParse(rawQuery);

        if (!parsed.success) {
            throw new ValidationError(parsed.error.flatten());
        }
        const query = parsed.data;

        const filters: OrderFilters = {
            status: query.status,
            startDate: query.startDate,
            endDate: query.endDate,
        };
        const offset = (query.page - 1) * query.pageSize;

        const [total, rows] = await Promise.all([
            countOrders(filters),
            findOrders(filters, query.pageSize, offset),
        ]);

        const orders: OrderDTO[] = rows.map((row: any) => ({
            orderId: row.order_id,
            orderDate: row.order_date,
            orderCreatedAt: row.order_created_at,
            status: row.order_status,
            totalAmount: row.order_total_amount,
            customerName: row.customer_name,
            itemCount: parseInt(row.item_count, 10),
        }));

        return {
            orders,
            pagination: {
                page: query.page,
                pageSize: query.pageSize,
                total,
                totalPages: Math.ceil(total / query.pageSize),
            },
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}