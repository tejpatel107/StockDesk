import type { Request } from "express";
import { getAllProductsDb, getProductsByCategoryIdDb, getProductsByNameOrSkuDb, getProductsWithinPriceRangeDb, getProductsWithinStockDb, getProductsOutOfStockDb, addNewProductDb, type ProductRecord, deleteProductDb } from "./product.db.js";

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
    
    const { name, price, quantity, categoryId } = req.body;
    const userId :string = req.user?.userId;

    console.log(userId);

    try {
        const product : ProductRecord = await addNewProductDb(name, price, quantity, categoryId, userId);
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
    
    const userId :string = req.user?.userId;
    const { productId } = req.body; 

    console.log(userId);

    try {
        const product : ProductRecord = await deleteProductDb(productId, userId );
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

