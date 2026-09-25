import type { Request } from "express";
import { getAllProductsDb, getProductsByCategoryIdDb, getProductsByNameOrSkuDb, getProductsWithinPriceRangeDb, getProductsWithinStockDb, getProductsOutOfStockDb, addNewProductDb, type ProductRecord, deleteProductDb, updateProductDb, getProductByIdsDb } from "./product.db.js";
import { error } from "node:console";
import { randomUUID } from "node:crypto";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";

export async function getAllProductsService() {

    try {
        const products = await getAllProductsDb();
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };

    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}


export async function getProductsByNameOrSkuService(req: Request) {

    const { search } = req.query;
    console.log(search);
    try {
        const products = await getProductsByNameOrSkuDb(search as string);
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };

    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function getProductsByCategoryIdService(req: Request) {

    const { categoryId } = req.query;
    try {
        const products = await getProductsByCategoryIdDb(categoryId as string);
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function getProductsWithinPriceRangeService(req: Request) {
    const { minPrice, maxPrice } = req.query;

    try {
        const products = await getProductsWithinPriceRangeDb(Number(minPrice), Number(maxPrice));
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function getProductsWithinStockService(req: Request) {
    const inStock = req.query.inStock === "true";

    try {
        const products = inStock ? await getProductsWithinStockDb() : await getProductsOutOfStockDb();
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function addNewProductService(req: Request) {

    const { name, price, quantity, sku, categoryId } = req.body;
    const userId: string = req.user?.userId;

    console.log(userId);

    try {

        const products = await getProductsByNameOrSkuDb(sku);
        let product : ProductRecord = products.length > 0 && products[0];
        
        if (product.productSku === sku) {
            throw error("Product already exists");
        }
        
        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        product = await addNewProductDb(randomUUID(), name, sku, price, quantity, categoryId, userId, changeLogId);
        return {
            statusCode: 201,
            data: { product }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function deleteProductService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;

    try {

        let product = await getProductByIdsDb(id as string);

        if (!product) {
            throw new Error("Product not found!");
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        product = await deleteProductDb(product, userId, changeLogId);
        return {
            statusCode: 204,
            data: { productId: id, userId: userId }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function updateProductService(req: Request) {
    const userId: string = req.user?.userId;
    const { id } = req.params;
    const fields = req.body;

    try {

        let product = await getProductByIdsDb(id as string);

        if (!product) {
            throw new Error("Product does not exist, Please try to update existing product!");
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        
        product = await updateProductDb(product, userId, fields, changeLogId);
        
        return {
            statusCode: 200,
            data: { product }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}
