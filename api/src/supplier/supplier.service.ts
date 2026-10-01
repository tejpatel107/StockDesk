import type { Request } from "express";
import { getAllSuppliersDb, addNewSupplierDb, deleteSupplierDb, updateSupplierDb, getSupplierByIdDb, getSuppliersByNameDb } from "./supplier.db.js";
import { error } from "node:console";
import { randomUUID } from "node:crypto";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";

export async function getAllSuppliersService() {

    try {
        const Suppliers = await getAllSuppliersDb();
        return {
            statusCode: 200,
            data: { count: Suppliers.length, Suppliers }
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


export async function getSuppliersByNameService(req: Request) {

    const { search } = req.query;
    console.log(search);
    try {
        const Suppliers = await getSuppliersByNameDb(search as string);
        return {
            statusCode: 200,
            data: { count: Suppliers.length, Suppliers }
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

export async function addNewSupplierService(req: Request) {

    const { name, email, phoneNumber } = req.body;
    const userId: string = req.user?.userId;

    console.log(userId);

    try {

        const suppliers = await getSuppliersByNameDb(name);
        let supplier = suppliers.length > 0 && suppliers[0];
        
        if (supplier.email === email || supplier.phoneNumber) {
            throw error("Supplier already exists");
        }
        
        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        supplier = await addNewSupplierDb(randomUUID(), name, email, phoneNumber, userId, changeLogId);
        return {
            statusCode: 201,
            data: { supplier }
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

export async function deleteSupplierService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;

    try {

        let supplier = await getSupplierByIdDb(id as string);

        if (!supplier) {
            throw new Error("Supplier not found!");
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        supplier = await deleteSupplierDb(supplier, userId, changeLogId);
        return {
            statusCode: 204,
            data: supplier
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

export async function updateSupplierService(req: Request) {
    const userId: string = req.user?.userId;
    const { id } = req.params;
    const fields = req.body;

    try {

        let supplier = await getSupplierByIdDb(id as string);

        if (!supplier) {
            throw new Error("Supplier does not exist, Please try to update existing Supplier!");
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        
        supplier = await updateSupplierDb(supplier, userId, fields, changeLogId);
        
        return {
            statusCode: 200,
            data: supplier
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
