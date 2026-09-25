import type { Request } from "express";
import { AppError, ValidationError } from "../../utilities/globalErrorHandlers.js";
import { getOrdersQuerySchema, ORDER_STATUSES } from "../../validators/order.validation.js";
import { addOrderItems, createNewOrderDb, getOrderByIdDb, getOrdersDb, updateProductQuantityDb } from "./order.db.js";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";
import { getProductByIdsDb } from "../product/product.db.js";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";

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

    const userId = req.user?.userId;
    const { id: orderId } = req.params;

    const order = (await getOrderByIdDb(userId, orderId as string)).rows[0];

    return {
        statusCode: 200,
        data: {
            order
        }
    }
}

export async function createNewOrderService(req: Request) {

    const { customerId, items } = req.body;
    const userId = req.user?.userId;

    const itemsMap = new Map(
        items.map((item: { productId: any; quantity: any; }) => [item.productId, item.quantity])
    );
    console.log(itemsMap);
    const client = await pool.connect();

    try {

        const { rows: products } = await getDesiredProducts(items);

        await areProductsInStock(products, itemsMap);

        const lineTotals = await calculateLineTotalForProducts(products, itemsMap);

        const orderTotal = lineTotals.reduce((sum, total) => sum + total, 0);

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId);

        await client.query('BEGIN');

        const { rows: [order] } = await createNewOrderDb(client, customerId, ORDER_STATUSES.PENDING, orderTotal, changeLog.change_log_id);

        await addOrderItems(client, order.orderId, products, itemsMap, lineTotals);

        await updateProductQuantityDb(client, changeLog.change_log_id, products, itemsMap);

        await client.query('COMMIT');

        return {
            statusCode: 204,
            data: {
                orderId: order.orderId
            }
        }

    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError((error as Error).message, 500);
    } finally {
        await client.release();
    }

}

async function getDesiredProducts(items: any[]) {
    const ids: string[] = items.map(item => item.productId);
    return await getProductByIdsDb(ids);
}

async function calculateLineTotalForProducts(products: any[], items: Map<any, any>) {
    ``
    return products.map((product) =>
        product.product_price * items.get(product.product_id)
    );
}

async function areProductsInStock(products: any[], items: Map<any, any>) {

    const flagedProducts = products.filter((product) => {
        const quantity = items.get(product.product_id);
        return quantity !== undefined && product.product_quantity < quantity;
    });

    if (flagedProducts.length > 0) {
        const ids = flagedProducts.map(flaged_product => flaged_product.product_id);
        throw new Error(`Not enough stock for products: ${ids.join(", ")}`);
    }

}