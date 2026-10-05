import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";

export async function getAllSuppliersDb() {
    let query = `
        SELECT * FROM "supplier"
        WHERE (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query));
}

export async function getSupplierByIdDb(supplierId: string) {
    let query = `
        SELECT * FROM "supplier"
        WHERE supplier_id = $1 AND (flag_deleted = false);
    `;
    return (await pool.query(query, [supplierId]));
}

export async function getSuppliersByNameDb(value: string) {
    let query = `
        SELECT * FROM "supplier"
        WHERE (supplier_name = $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [value]));
}

export async function getSuppliersByEmailOrPhoneNumberDb(value: string) {
    let query = `
        SELECT * FROM "supplier"
        WHERE (supplier_email ILIKE $1 OR supplier_phoneNumber ILIKE $1) AND (history_id is NULL) AND (flag_deleted = false);
    `;
    return (await pool.query(query, [`%${value}%`])).rows;
}

export async function addNewSupplierDb(client: PoolClient, name: string, email: string, phoneNumber: string, changeLogId: string) {

    const { rows: [supplier] } = await client.query(
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

    return supplier;
}

export async function deleteSupplierDb(client: PoolClient, supplier: any, changeLogId: string) {

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

    return {
        "deleted supplier id": supplier.supplier_id,
        changeLogId
    };
}

export async function updateSupplierDb(client: PoolClient, supplier: any, setClause: string, values: any[]) {

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

    return updatedSupplier;

}