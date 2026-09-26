import type { Request } from "express";
import type { ParsedQs } from "qs";
import { getProductsAtOrBelowStockLevelDb } from "./report.db.js";
import { AppError } from "../../utilities/globalErrorHandlers.js";


export async function getLowStockService(req: Request) {
    const { threshold } = req.query;

    try {
        const products = await getProductsAtOrBelowStockLevelDb(Number(threshold));

        return {
            statusCode: 200,
            data: {
                count: products.length,
                products: products
            }
        };
    } catch (error) {
        throw new AppError(error.message, 500);
    }
}