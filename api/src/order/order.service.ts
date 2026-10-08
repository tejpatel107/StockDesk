import type { Request } from "express";
import { AppError, NotFoundError, ValidationError } from "../../utilities/globalErrorHandlers.js";
import { ordersQuerySchema, ORDER_STATUSES } from "../../validators/order.validation.js";
import { addOrderItemsDb, changeOrderStatusDb, createNewOrderDb, getOrderByIdDb, getOrderByIdForCustomerDb, getOrderByIdForStaffDb, getOrdersDb, getProductsDb, updateProductQuantityDb } from "./order.db.js";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { ROLES } from "../../../db/roles.js";

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

    const parsed = ordersQuerySchema.safeParse(req.query);

    if (!parsed.success) {
        throw new ValidationError(
            parsed.error.issues.map((issue) => ({
                location: "params",
                field: issue.path.join("."),
                message: issue.message,
            }))
        );
    }

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

    try {

        const { rows: orders } = (await getOrdersDb(params, whereClause.join(" AND "), limitIndex, offsetIndex, sort));
        return {
            statusCode: 200,
            data: {
                count: orders.length,
                orders
            }
        }
    } catch (error) {
        console.log("error: ", error);
        // throw new AppError(error.message);
    }
}

export async function getOrderByIdService(req: Request) {

    const { id: orderId } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    let orderItems = [];

    if (role === ROLES.CUSTOMER) {
        const { rows } = await getOrderByIdForCustomerDb(userId, orderId as string);
        orderItems = rows;
    } else {
        const { rows } = await getOrderByIdForStaffDb(orderId as string);
        orderItems = rows;
    }

    console.log(orderItems);

    if (orderItems.length === 0) {
        throw new NotFoundError(`No order found for id: ${orderId}`);
    }

    const { order_id, customer_name, order_status, order_date, order_total_amount } = orderItems[0];

    const order = {
        "order id": order_id,
        "customer name": customer_name,
        "order status": order_status,
        "order date": order_date,
        "order total amount": order_total_amount,
        "order items": orderItems.map(oi => ({
            "order item id": oi.order_item_id,
            "product id": oi.product_id,
            "product name": oi.product_name,
            "product unit price at time of order": oi.order_item_unit_price_at_time_of_order,
            "order item line total": oi.order_item_line_total,
            "order item quantity": oi.order_item_quantity
        }))
    };

    return {
        statusCode: 200,
        data: order
    }
}

export async function createNewOrderService(req: Request) {

    const { customerId, items } = req.body;
    const userId = req.user?.userId;

    const itemsMap = new Map<string, number>(
        items.map((item: { productId: string; quantity: number; }) => [item.productId, item.quantity])
    );
    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const products = await getDesiredProducts(client, Array.from(itemsMap.keys()));

        await areProductsInStock(products, itemsMap);

        const lineTotals = calculateLineTotalForProducts(products, itemsMap);

        const orderTotal = lineTotals.reduce((sum, total) => sum + total, 0);

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);

        const updatedProductQuantities = new Map(
            products.map(product => [product.product_id, product.product_quantity - itemsMap.get(product.product_id)])
        );

        const { rows: [order] } = await createNewOrderDb(client, customerId, ORDER_STATUSES.PENDING, orderTotal, changeLog.change_log_id);
        console.log(order.order_id);
        await addOrderItemsDb(client, order.order_id, products, itemsMap, lineTotals);

        await updateProductQuantityDb(client, changeLog.change_log_id, products, updatedProductQuantities);

        await client.query('COMMIT');

        return {
            statusCode: 201,
            data: {
                orderId: order.order_id
            }
        }

    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError((error as Error).message);
    } finally {
        await client.release();
    }

}

async function getDesiredProducts(client: PoolClient, reqeuestedProductIds: string[]) {
    const { rows: products } = await getProductsDb(client, reqeuestedProductIds);

    const foundProductIds = new Set(products.map(p => p.product_id));

    const ids = reqeuestedProductIds.filter(id => !foundProductIds.has(id));

    if (ids.length > 0) {
        throw new NotFoundError(`Product does not exist for : ${Array.from(ids).join(", ")}`)
    }

    return products;

}

function calculateLineTotalForProducts(products: any[], items: Map<any, any>) {
    ``
    return products.map((product) =>
        product.product_price * items.get(product.product_id)
    );
}

async function areProductsInStock(products: any[], items: Map<string, number>) {

    const flagedProducts = products.filter((product) => {
        const quantity = items.get(product.product_id);
        return quantity !== undefined && product.product_quantity < quantity;
    });

    if (flagedProducts.length > 0) {
        const ids = flagedProducts.map(flaged_product => flaged_product.product_id);
        throw new AppError(`Not enough stock for products: ${ids.join(", ")}`);
    }

}

export async function updateOrderService(req: Request) {

    const { status } = req.body;
    const { id: orderId } = req.params;
    const userId = req.user?.userId;

    const { rows: orderItems } = await getOrderByIdDb(orderId as string);

    if (orderItems.length === 0) {
        throw new AppError(`order for order_id: ${orderId} does not exist!`);
    }

    const order = orderItems[0];
    console.log(order)

    if (order.order_status === ORDER_STATUSES.CANCELLED) {
        throw new AppError("ordered is already canceled! Can't process or change the status of canceled orders.");
    }

    if (order.order_status === ORDER_STATUSES.DELIVERED) {
        throw new AppError("ordered is already delivered! Can't process delivered orders further.");
    }

    if (order.order_status === ORDER_STATUSES.SHIPPED && status !== ORDER_STATUSES.DELIVERED) {
        throw new AppError(`ordered is already shipped and ready to be delivered soon! Can't cancel the order at this time. If requested status change is not ${ORDER_STATUSES.CANCELLED} then it is invalid status transition.`);
    }

    if (order.order_status === ORDER_STATUSES.CONFIRMED
        && (status !== ORDER_STATUSES.SHIPPED && status !== ORDER_STATUSES.CANCELLED)) {
        throw new AppError(`Invalid transition of status. Confirmed orders can only be transitioned to ${ORDER_STATUSES.CANCELLED} or ${ORDER_STATUSES.SHIPPED} status.`);
    }

    if (order.order_status === ORDER_STATUSES.PENDING
        && (status !== ORDER_STATUSES.CONFIRMED && status !== ORDER_STATUSES.CANCELLED)) {
        throw new AppError(`Invalid transition of status. Pending orders can only be transitioned to ${ORDER_STATUSES.CANCELLED} or ${ORDER_STATUSES.CONFIRMED} status.`);
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);

        const { rows: [updatedOrder] } = await changeOrderStatusDb(client, order, changeLog.change_log_id, status);

        if (status === ORDER_STATUSES.CANCELLED) {

            const currentOrderProductQuantities = new Map();
            orderItems.forEach((item) => {
                currentOrderProductQuantities.set(item.productId, item.quantity);
            });

            const { rows: products } = await getProductsDb(client, Array.from(currentOrderProductQuantities.keys()));

            const updatedOrderProductQuantities = new Map(
                products.map(product => [product.product_id, product.product_quantity + currentOrderProductQuantities.get(product.product_id)])
            );

            await updateProductQuantityDb(client, changeLog.change_log_id, products, updatedOrderProductQuantities);

        }

        await client.query('COMMIT');

        return {
            statusCode: 200,
            data: updatedOrder
        }
    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError((error as Error).message, 500);
    } finally {
        await client.release();
    }
}