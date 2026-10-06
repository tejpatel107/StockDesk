import type { Request } from "express";
import { getAllSuppliersDb, addNewSupplierDb, deleteSupplierDb, updateSupplierDb, getSupplierByIdDb, getSuppliersByNameDb } from "./supplier.db.js";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { pool } from "../../../db/db.js";
import { AppError, ConflictError, NotFoundError } from "../../utilities/globalErrorHandlers.js";

const allowedFields = {
    name: "supplier_name",
    email: "supplier_email",
    phoneNumber: "supplier_phone_number"
} as const;

type AllowedKeys = keyof typeof allowedFields;

export async function getAllSuppliersService() {

    const { rows: suppliers } = await getAllSuppliersDb();
    return {
        statusCode: 200,
        data: { count: suppliers.length, suppliers }
    };
}

export async function getSuppliersByNameService(req: Request) {

    const { search } = req.query;
    const { rows: suppliers } = await getSuppliersByNameDb(search as string);
    return {
        statusCode: 200,
        data: { suppliers }
    };

}

export async function addNewSupplierService(req: Request) {

    const { name, email, phoneNumber } = req.body;
    const userId: string = req.user?.userId;

    let { rows: [supplier] } = await getSuppliersByNameDb(name);

    if (supplier) {
        throw new ConflictError("Supplier already exists");
    }

    const client = await pool.connect();
    try {

        await client.query('BEGIN');

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);
        const { rows: [supplier] } = await addNewSupplierDb(client, name, email, phoneNumber, changeLog.change_log_id);

        await client.query('COMMIT');

        return {
            statusCode: 201,
            data: {
                name: supplier.supplierName,
                email: supplier.supplierEmail,
                "phone number": supplier.supplierPhoneNumber,
            }
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        client.release();
    }
}

export async function deleteSupplierService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;

    let { rows: [supplier] } = await getSupplierByIdDb(id as string);

    if (!supplier) {
        throw new NotFoundError(`Supplier for id: ${id} does not exist!`);
    }

    const client = await pool.connect();
    try {

        await client.query('BEGIN');

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);
        supplier = await deleteSupplierDb(client, supplier, changeLog.change_log_id);

        await client.query('COMMIT');

        return {
            statusCode: 204,
            data: supplier
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        client.release();
    }
}

export async function updateSupplierService(req: Request) {
    const userId: string = req.user?.userId;
    const { id } = req.params;
    const fields = req.body;

    let { rows : [supplier] } = await getSupplierByIdDb(id as string);

    if (!supplier) {
        throw new NotFoundError(`Supplier does not exist for id: ${id}, please try to update existing supplier!`);
    }

    const keys = (Object.keys(fields)).filter((key): key is AllowedKeys => {
        return Object.hasOwn(allowedFields, key) && (fields[key] !== undefined || fields[key] !== null)
    });

    if (keys.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    const rows = keys.map((k) => ({ field: allowedFields[k], value: fields[k] }));

    const client = await pool.connect();
    try {

        await client.query('BEGIN');

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);

        supplier = await updateSupplierDb(client, supplier, rows, changeLog.change_log_id);

        await client.query('COMMIT');

        return {
            statusCode: 204,
            data: supplier
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        client.release();
    }
}
