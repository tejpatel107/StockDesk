import type { Request } from "express";
import type { ParsedQs } from "qs";
import { getTopSellingProductsByQuantitiesSoldDb, getProductsAtOrBelowStockLevelDb, getSalesSummaryDb } from "./report.db.js";
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
        throw new AppError(error.message);
    }
}

export async function getTopProductsService(req: Request) {

    const { limit } = req.query;

    try {
        const products = await getTopSellingProductsByQuantitiesSoldDb(Number(limit));

        return {
            statusCode: 200,
            data: {
                count: products.length,
                products: products
            }
        }
    } catch (error) {
        throw new AppError(error.message);
    }

}
export async function getSalesSummaryService(req: Request) {

    const { from, to } = req.query;

    try {

        const condition: string[] = [];
        const values: string[] = [];

        if (from) {
            values.push(from as string);
            condition.push(`o.order_date >= $${values.length}`);
        }

        if (to) {
            values.push(to as string);
            condition.push(`o.order_date <= $${values.length}`);
        }

        const whereClause = condition.join(" AND ");

        const { rows: [summary] } = await getSalesSummaryDb(whereClause, values);

        return {
            statusCode: 200,
            data: {
                "Sales Summary": summary
            }
        };
    } catch (error) {
        throw new AppError(error.message, 500);
    }
}