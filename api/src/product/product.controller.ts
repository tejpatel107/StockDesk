import { request, type Request, type Response } from "express";
import service from "./product.service.js";

export async function getProducts(req: Request, res: Response) {
    const { categoryId, search } = req.query;

    if (categoryId === "string") {
        return await getProductByCategoryId(req, res);
    } else if (search === "string") {
        return await getProductByNameOrSku(req, res);
    }
    return await getAllProducts(req, res);

}

async function getAllProducts(req: Request, res: Response) {
    const result = await service.getAllProducts();
    return res.status(request?.statusCode as number).json(result?.data);
};

async function getProductByNameOrSku(req: Request, res: Response) {
    const result = await service.getProductByNameOrSku(req);
    return res.status(request?.statusCode as number).json(result?.data);
}

async function getProductByCategoryId(req: Request, res: Response) {
    const result = await service.getProductByCategoryId(req);
    return res.status(request?.statusCode as number).json(result?.data);
}
