import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";
import { insertQueryBuilder, updateQueryBuilder } from "../../../db/querybuilder.js";

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

    const { sql, values } = insertQueryBuilder(
        'supplier',
        [
            { "field": "supplier_name", "value": name },
            { "field": "supplier_email", "value": email },
            { "field": "supplier_phone_number", "value": phoneNumber },
            { "field": "flag_deleted", "value": false },
            { "field": "change_log_id", "value": changeLogId },
            { "field": "history_id", "value": null }
        ],
        [
            'supplier_id AS "supplierId"',
            'supplier_name AS "supplierName"',
            'supplier_email AS "supplierEmail"',
            'supplier_phone_number AS "supplierPhoneNumber"'
        ]
    );

    return await client.query(sql, values);
}

export async function deleteSupplierDb(client: PoolClient, supplier: any, changeLogId: string) {

    const { sql, values } = updateQueryBuilder(
        "supplier",
        [
            { field: "flag_deleted", value: true },
            { field: "change_log_id", value: changeLogId },
        ],
        supplier.supplier_id
    );
    await client.query(sql, values);

    // 2. Insert the history row (snapshot of the supplier before deletion)
    const historyQuery = insertQueryBuilder("supplier", [
        { field: "supplier_name", value: supplier.supplier_name },
        { field: "supplier_email", value: supplier.supplier_email },
        { field: "supplier_phone_number", value: supplier.supplier_phone_number },
        { field: "flag_deleted", value: supplier.flag_deleted },
        { field: "history_id", value: supplier.supplier_id },
        { field: "change_log_id", value: supplier.change_log_id },
    ]);
    await client.query(historyQuery.sql, historyQuery.values);

    return {
        "deleted supplier id": supplier.supplier_id,
        changeLogId
    };
}

export async function updateSupplierDb(client: PoolClient, supplier: any, rows: { field: string; value: unknown }[], changeLogId: string) {

    // 1. Update the current row
    const { sql, values } = updateQueryBuilder(
        "supplier",
        [
            { "field" : "change_log_id", value : changeLogId },
            ...rows
        ],
        supplier.supplier_id,
        [],
        true // RETURNING *
    );
    const {
        rows: [updatedSupplier],
    } = await client.query(sql, values);

    // 2. Insert the history row (snapshot of the supplier before the update)
    const historyQuery = insertQueryBuilder("supplier", [
        { field: "supplier_name", value: supplier.supplier_name },
        { field: "supplier_email", value: supplier.supplier_email },
        { field: "supplier_phone_number", value: supplier.supplier_phone_number },
        { field: "flag_deleted", value: supplier.flag_deleted },
        { field: "history_id", value: supplier.supplier_id },
        { field: "change_log_id", value: changeLogId },
    ]);
    await client.query(historyQuery.sql, historyQuery.values);

    return updatedSupplier;
}