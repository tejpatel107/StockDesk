import { type Request, type Response } from "express";
import { getAllCategoriesService, deleteCategoryService, updateCategoryService, addNewCategoryService, getCategoryByNameService } from "./category.service.js";

export async function getCategoriesController(req: Request, res: Response) {
    const { search } = req.query;

    if (typeof search === "string" && search.length > 0) {
        return await getCategoryByName(req, res);
    } 

    return await getAllCategories(req, res);

}

async function getAllCategories(req: Request, res: Response) {
    const result = await getAllCategoriesService();
    return res.status(result?.statusCode as number).json(result?.data);
};

async function getCategoryByName(req: Request, res: Response) {
    const result = await getCategoryByNameService(req);
    return res.status(result?.statusCode as number).json(result?.data);
};

export async function addNewCategoryController(req: Request, res: Response) {
    const result = await addNewCategoryService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function deleteCategoryController(req: Request, res: Response){
    const result = await deleteCategoryService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function updateCategoryController(req: Request, res: Response) {
    const result = await updateCategoryService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}