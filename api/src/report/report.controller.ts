import { type Request, type Response } from "express";
import { getLowStockService, getSalesSummaryService, getTopProductsService } from "./report.service.js";

export async function getLowStockController(req: Request, res: Response) {
    const result = await getLowStockService(req);
    return res.status(result?.statusCode as number).json(result?.data);
};

export async function getTopProductsController(req: Request, res: Response) {
    const result = await getTopProductsService(req);
    return res.status(result?.statusCode as number).json(result?.data);
};

export async function getSalesSummaryController(req: Request, res: Response) {
    const result = await getSalesSummaryService(req);
    return res.status(result?.statusCode as number).json(result?.data);
};

async function deleteReportController(req: Request, res: Response) {
    const result = await deleteReportService();
    return res.status(result?.statusCode as number).json(result?.data);
};