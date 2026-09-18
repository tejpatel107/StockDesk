import type { Request } from "express";
import repo from "./product.db.js";
import z from "zod";

async function getAllProducts() {

    try {
        const products = await repo.getAllProducts();
        return {
            statusCode: 200,
            data: { products }
        };

    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: error
            }
        };
    }
}


async function getProductByNameOrSku(req: Request) {

    const { search } = req.query;

    try {
        const products = await repo.getProductByNameOrSku(search as string);
        return {
            statusCode: 200,
            data: { products }
        };

    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: error
            }
        };
    }
}

async function getProductByCategoryId(req: Request) {

    const { categoryId } = req.query;

    try {
        const products = await repo.getProductByCategoryId(categoryId as string);
        return {
            statusCode: 200,
            data: { products }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: error
            }
        };
    }
}

export default {
    getAllProducts,
    getProductByNameOrSku
}