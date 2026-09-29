import { type Request, type Response } from "express";
import { createNewOrderService, getOrderByIdForCustomerService, getOrdersService, updateOrderService } from "./order.service.js";


export async function getOrdersController(req: Request, res: Response) {
    const result = await getOrdersService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function getOrderByIdForCustomerController(req: Request, res: Response) {
    const result = await getOrderByIdForCustomerService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function createNewOrderController(req: Request, res: Response) {
    const result = await createNewOrderService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function updateOrderController(req: Request, res: Response) {
    const result = await updateOrderService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}