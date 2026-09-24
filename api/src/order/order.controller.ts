import { type Request, type Response } from "express";
import { getOrderByIdService, getOrdersService } from "./order.service.js";


export async function getOrdersController(req: Request, res: Response) {
    const result = await getOrdersService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function getOrderByIdController(req: Request, res: Response) {
    const result = await getOrderByIdService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}