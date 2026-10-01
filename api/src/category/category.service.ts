import type { Request } from "express";
import { getAllCategoriesDb, addNewCategoryDb, deleteCategoryDb, updateCategoryDb, getCategoryByIdDb, getCategoryByNameDb } from "./category.db.js";
import { error } from "node:console";
import { randomUUID } from "node:crypto";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { NotFoundError } from "../../utilities/globalErrorHandlers.js";

export async function getAllCategoriesService() {

    try {
        const categories = await getAllCategoriesDb();
        return {
            statusCode: 200,
            data: { count: categories.length, categories }
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


export async function getCategoryByNameService(req: Request) {

    const { search } = req.query;
    console.log(search);
    try {
        const categories = await getCategoryByNameDb(search as string);
        return {
            statusCode: 200,
            data: { count: categories.length, categories }
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

export async function addNewCategoryService(req: Request) {

    const { name, description } = req.body;
    const userId: string = req.user?.userId;

    console.log(userId);

    try {

        let category = await getCategoryByNameDb(name);

        if (category && category.name === name) {
            throw new Error(`Category by name ${category.name} already exist!`);
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        category = await addNewCategoryDb(randomUUID(), name, description, userId, changeLogId);
        return {
            statusCode: 201,
            data: { category }
        };
    } catch (error) {
        return {
            statusCode: 409,
            data: {
                error: error.message
            }
        };
    }
}

export async function deleteCategoryService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;

    let category = await getCategoryByIdDb(id as string);

    if (!category) {
        throw new NotFoundError("Category not found!");
    }

    const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
    category = await deleteCategoryDb(category, userId, changeLogId);
    console.log(category);

    if (!category) {
        throw error("Error deleting category.");
    }

    return {
        statusCode: 204,
        data: category
    };
}

export async function updateCategoryService(req: Request) {
    const userId: string = req.user?.userId;
    const { id } = req.params;
    const fields = req.body;

    try {

        let category = await getCategoryByIdDb(id as string);

        if (!category) {
            throw new Error("Category does not exist, Please try to update existing Category!");
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;

        category = await updateCategoryDb(category, userId, fields, changeLogId);

        return {
            statusCode: 200,
            data: category
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
