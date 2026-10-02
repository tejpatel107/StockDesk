import type { Request } from "express";
import { getAllCategoriesDb, addNewCategoryDb, deleteCategoryDb, updateCategoryDb, getCategoryByIdDb, getCategoryByNameDb } from "./category.db.js";
import { error } from "node:console";
import { randomUUID } from "node:crypto";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { AppError, ConflictError, NotFoundError } from "../../utilities/globalErrorHandlers.js";
import { pool } from "../../../db/db.js";

// incoming request field names to category table column names
const allowedFields = {
    name: "category_name",
    description: "category_description"
} as const;

type AllowedKeys = keyof typeof allowedFields;

export async function getAllCategoriesService() {
    const { rows: categories } = await getAllCategoriesDb();
    return {
        statusCode: 200,
        data: { count: categories.length, categories }
    };
}

export async function getCategoryByNameService(req: Request) {

    const { search } = req.query;
    const { rows: [category] } = await getCategoryByNameDb(search as string);

    if (!category) {
        throw new NotFoundError(`No category found by name: ${search}`);
    }

    return {
        statusCode: 200,
        data: { category }
    };
}

export async function addNewCategoryService(req: Request) {

    const { name, description } = req.body;
    const userId: string = req.user?.userId;

    const { rows: [category] } = await getCategoryByNameDb(name);

    if (category) {
        throw new ConflictError(`Category by name ${category.name} already exist!`);
    }

    const { rows: [changeLog] } = await insertNewChangeLogRecord(userId);
    const { rows: [newCategory] } = await addNewCategoryDb(name, description, userId, changeLog.change_log_id);

    return {
        statusCode: 201,
        data: { newCategory }
    };
}

export async function deleteCategoryService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;

    const { rows: [category] } = await getCategoryByIdDb(id as string);

    if (!category) {
        throw new NotFoundError(`Category by id: ${id} not found!`);
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);
        const deletedCategory = await deleteCategoryDb(client, category, changeLog.change_log_id);

        await client.query('COMMIT');

        return {
            statusCode: 204,
            data: deletedCategory
        };

    } catch (error) {
        client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        client.release();
    }
}

export async function updateCategoryService(req: Request) {
    const userId: string = req.user?.userId;
    const { id } = req.params;
    const fields = req.body;

    const { rows: [category] } = await getCategoryByIdDb(id as string);

    if (!category) {
        throw new NotFoundError(`Category by id: ${id} not found!`);
    }

    const keys = (Object.keys(fields)).filter((key): key is AllowedKeys => {
        return Object.hasOwn(allowedFields, key) && (fields[key as AllowedKeys] !== undefined || fields[key as AllowedKeys] !== null)
    });

    let values = [...keys.map((k) => fields[k]), category.category_id];
    console.log(values);

    const setClause = [
        "change_log_id = $1",
        ...keys.map((k, i) => `${allowedFields[k]} = $${i + 2}`),
    ].join(", ");
    console.log(setClause);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);
        values = values.toSpliced(0,0,changeLog.change_log_id);
        const updatedCategory = await updateCategoryDb(client, category, setClause, values);

        await client.query('COMMIT');

        return {
            statusCode: 200,
            data: {
                id: updatedCategory.category_id,
                name: updatedCategory.category_name,
                description: updatedCategory.category_description
            }
        };

    } catch (error) {
        client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        client.release();
    }
}
