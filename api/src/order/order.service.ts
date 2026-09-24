import type { Request } from "express";
import { ValidationError } from "../../utilities/globalErrorHandlers.js";
import { getOrdersQuerySchema } from "../../validators/order.validation.js";
import { getOrderByIdDb, getOrdersDb } from "./order.db.js";

export interface OrderDTO {
    orderDate: string;
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

export async function getOrdersService(req: Request): Promise<PaginatedOrders | any> {

    const parsed = getOrdersQuerySchema.safeParse(req.query);

    if (!parsed.success) {
        throw new ValidationError(
            parsed.error.issues.map((issue) => ({
                location: "params",
                field: issue.path.join("."),
                message: issue.message,
            }))
        );
    }

    console.log(parsed.data);

    const { page, pageSize, status, startDate, endDate, sort } = parsed.data;

    const whereClause: string[] = ["o.history_id is NULL", "o.flag_deleted = false"];
    const params = [];

    if (status) {
        params.push(status);
        whereClause.push(`o.order_status = $${params.length}`);
    }
    if (startDate) {
        params.push(startDate);
        whereClause.push(`o.order_date >= $${params.length}`);
    }
    if (endDate) {
        params.push(endDate);
        whereClause.push(`o.order_date <= $${params.length}`);
    }

    console.log(whereClause.join(" AND "));
    console.log(params);

    params.push(pageSize, (page - 1) * pageSize);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;

    const { rows: orders } = (await getOrdersDb(params, whereClause.join(" AND "), limitIndex, offsetIndex, sort)); 
    return {
        statusCode: 200,
        data: {
            count: orders.length,
            orders
        }
    }
}

export async function getOrderByIdService(req: Request) {
    const { id } = req.params;

    return { 
        statusCode: 200,
        data: await getOrderByIdDb(id)
    }
}