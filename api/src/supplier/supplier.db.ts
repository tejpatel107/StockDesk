import { randomUUID, type UUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";

const allowedFields = {
    name: "supplier_name",
    email: "supplier_email",
    phoneNumber: "supplier_phone_number"
} as const;

type AllowedKeys = keyof typeof allowedFields;
type SupplierUpdate = Partial<{
    name: string;
    email: string,
    phoneNumber: string
}>

export async function getAllSuppliersDb() {
    let query = `
        SELECT * FROM "supplier"
        WHERE (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query)).rows;
}

export async function getSupplierByIdDb(supplierId: string) {
    let query = `
        SELECT * FROM "supplier"
        WHERE supplier_id = $1 AND (flag_deleted = false);
    `;
    return (await pool.query(query, [supplierId])).rows[0];
}

export async function getSuppliersByNameDb(value: string) {
    let query = `
        SELECT * FROM "supplier"
        WHERE (supplier_name ILIKE $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [`%${value}%`])).rows;
}

export async function getSuppliersByEmailOrPhoneNumberDb(value: string) {
    let query = `
        SELECT * FROM "supplier"
        WHERE (supplier_email ILIKE $1 OR supplier_phoneNumber ILIKE $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [`%${value}%`])).rows;
}

export async function addNewSupplierDb(supplierId: string, name: string, email: string, phoneNumber: string, userId: string, changeLogId: string) {

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const res = await client.query(
            `INSERT INTO "supplier"
                (supplier_name, 
                supplier_email,
                supplier_phone_number,
                flag_deleted, 
                change_log_id, 
                history_id)
                VALUES ($1, $2, $3, false, $4, NULL)
                RETURNING
                    supplier_id AS "supplierId",
                    supplier_name AS "supplierName",
                    supplier_email AS "supplierEmail",
                    supplier_phone_number AS "supplierPhoneNumber";`,
            [name, email, phoneNumber, changeLogId]
        );

        await client.query('COMMIT');
        return res.rows[0];

    } catch (error) {
        await client?.query('ROLLBACK');
        throw error;
    } finally {
        client?.release();
    }

}

export async function deleteSupplierDb(supplier: any, userId: string, changeLogId: string) {

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        await client.query(`
                    UPDATE supplier
                    SET
                        flag_deleted = true,
                        change_log_id = $1
                    WHERE supplier_id = $2
                `, [changeLogId, supplier.supplier_id]);

        await client.query(`
                INSERT INTO supplier (
                    supplier_name,
                    supplier_email,
                    supplier_phone_number,
                    flag_deleted,
                    history_id,
                    change_log_id
                ) VALUES ( $1, $2, $3, false, $4, $5)
            `, [supplier.supplier_name,
            supplier.supplier_email,
            supplier.supplier_phone_number,
            supplier.supplier_id,
            supplier.change_log_id
        ]);

        await client.query('COMMIT');

        return {
            "deleted supplier id": supplier.supplier_id,
            changeLogId
        };

    } catch (error) {
        await client?.query('ROLLBACK');
        throw error;
    } finally {
        client?.release();
    }
}

export async function updateSupplierDb(supplier: any, userId: string, updates: SupplierUpdate, changeLogId: string) {

    const keys = (Object.keys(updates)).filter((key): key is AllowedKeys => {
        return Object.hasOwn(allowedFields, key) && (updates[key as AllowedKeys] !== undefined || updates[key as AllowedKeys] !== null)
    });

    if (keys.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    const values = [changeLogId, ...keys.map((k) => updates[k]), supplier.supplier_id];
    console.log(values);

    const setClause = [
        "change_log_id = $1",
        ...keys.map((k, i) => `${allowedFields[k]} = $${i + 2}`),
    ].join(", ");
    console.log(setClause);

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();


        const {
            rows: [updatedSupplier],
        } = await client.query(
            `UPDATE supplier
             SET ${setClause}
             WHERE supplier_id = $${values.length}
             RETURNING *`,
            values
        );

        await client.query(`
                INSERT INTO supplier (
                    supplier_name,
                    supplier_email,
                    supplier_phone_number,
                    flag_deleted,
                    history_id,
                    change_log_id
                ) VALUES ( $1, $2, $3, false, $4, $5)
            `, [supplier.supplier_name,
            supplier.supplier_email,
            supplier.supplier_phone_number,
            supplier.supplier_id,
            supplier.change_log_id
        ]);

        await client.query("COMMIT");

        return updatedSupplier;

    } catch (error) {
        await client?.query("ROLLBACK");
        throw error;
    } finally {
        client?.release();
    }
}