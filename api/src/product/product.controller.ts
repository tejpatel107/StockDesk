import { type Request, type Response } from "express";
import { getAllProductsService, getProductsByCategoryIdService, getProductsByNameOrSkuService, getProductsWithinStockService, getProductsWithinPriceRangeService, addNewProductService, deleteProductService, updateProductService, importProductsService } from "./product.service.js";

export async function getProductsController(req: Request, res: Response) {
    const { categoryId, search, minPrice, maxPrice, inStock } = req.query;

    if (typeof categoryId === "string" && categoryId.length > 0) {
        return await getProductsByCategoryId(req, res);
    } else if (typeof search === "string" && search.length > 0) {
        return await getProductsByNameOrSku(req, res);
    } else if (minPrice && maxPrice) {
        return await getProductsWithinPriceRange(req, res);
    } else if (inStock?.length > 0) {
        return await getProductsWithinStock(req, res);
    }
    return await getAllProducts(req, res);

}

async function getAllProducts(req: Request, res: Response) {
    const result = await getAllProductsService();
    return res.status(result?.statusCode as number).json(result?.data);
};

async function getProductsByNameOrSku(req: Request, res: Response) {
    const result = await getProductsByNameOrSkuService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

async function getProductsByCategoryId(req: Request, res: Response) {
    const result = await getProductsByCategoryIdService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

async function getProductsWithinPriceRange(req: Request, res: Response) {
    const result = await getProductsWithinPriceRangeService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

async function getProductsWithinStock(req: Request, res: Response) {
    const result = await getProductsWithinStockService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function addNewProductController(req: Request, res: Response) {
    const result = await addNewProductService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function deleteProductController(req: Request, res: Response){
    const result = await deleteProductService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function updateProductController(req: Request, res: Response){
    const result = await updateProductService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function importProductsController(req: Request, res: Response){
    const result = await importProductsService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}