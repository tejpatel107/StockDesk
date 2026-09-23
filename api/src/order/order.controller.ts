import { type Request, type Response } from "express";
import { getOrders, ValidationError } from "./order.service.js";


export async function getOrdersController(req: Request, res: Response) {
    try {
        const result = await getOrders(req.query);
        res.json(result);
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ error: err.message, details: err.details });
        }
        console.error("getOrdersController failed:", err);
        res.status(500).json({ error: "failed to fetch orders" });
    }
}

async function getOrderByIdController(req: Request, res: Response) {
    const result = await getOrderByIdService(req);
    return res.statusCode(result?.statusCode as number).json(result?.data);
}