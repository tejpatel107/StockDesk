import { type Request, type Response } from "express";

async function getLowStockController(req: Request, res: Response) {
    const result = await getLowStockService();
    return res.status(result?.statusCode as number).json(result?.data);
};

async function getTopProductController(req: Request, res: Response) {
    const result = await getTopProductService();
    return res.status(result?.statusCode as number).json(result?.data);
};

async function getSalesSummaryController(req: Request, res: Response) {
    const result = await getSalesSummaryService();
    return res.status(result?.statusCode as number).json(result?.data);
};

async function deleteReportController(req: Request, res: Response) {
    const result = await deleteReportService();
    return res.status(result?.statusCode as number).json(result?.data);
};