import { randomUUID, type UUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";
import type { ROLES } from "../../../db/roles.js";

export async function getAllCustomersDb() {
    let query = `
        SELECT 
         c.customer_id,
         u.user_name,
         u.user_email,
         c.customer_phone_number,
         c.customer_address
        FROM "customer" AS c 
        LEFT JOIN "user" AS u 
        ON c.user_id = u.user_id 
        WHERE (c.history_id is NULL) 
            AND (c.flag_deleted = false) 
            AND (u.history_id is NULL) 
            AND (u.flag_deleted = false) 
    `;
    return (await pool.query(query)).rows;
}

export async function getCustomerByIdDb(customerId: string) {
    let query = `
        SELECT * FROM "customer"
        WHERE customer_id = $1 AND (flag_deleted = false) AND (history_id is NULL);
    `;
    return (await pool.query(query, [customerId])).rows[0];
}

export async function getCustomerByPhoneNumberOrEmailOrNameDb(value: string) {
    let query = `
        SELECT 
         c.customer_id,
         u.user_name,
         u.user_email,
         c.customer_phone_number,
         c.customer_address,
         u.user_role
        FROM "customer" AS c 
        LEFT JOIN "user" AS u 
        ON c.user_id = u.user_id AND (u.history_id is NULL) AND (u.flag_deleted = false) 
        WHERE (c.customer_phone_number ILIKE $1 OR u.user_email ILIKE $1 OR u.user_name ILIKE $1)
            AND (c.history_id is NULL)
            AND (c.flag_deleted = false)
            `;
    return (await pool.query(query, [`%${value}%`])).rows;
}

export async function getCustomerByPhoneNumberDb(number: number) {
    let query = `
        SELECT 
         c.customer_id,
         c.customer_phone_number AS "phoneNumber"
        FROM "customer" AS c 
        WHERE (c.customer_phone_number = $1)
            AND (c.history_id is NULL)
            AND (c.flag_deleted = false);`;
    return await pool.query(query, [number]);
}

export async function addNewCustomerDb(client: PoolClient, name: string, email: string, phoneNumber: string, address: string, password: string, role: ROLES, changeLogId: string) {

    const { rows: [newUser] } = await client.query(
        `INSERT INTO "user"
            (user_name, user_email, user_password, user_role, change_log_id, flag_deleted, history_id)
            VALUES ($1, $2, $3, $4, $5, false, NULL)
            RETURNING
                user_id AS "userId",
                user_name AS "userName",
                user_email AS "userEmail",
                user_role AS "userRole",
                change_log_id AS "changeLogId";`,
        [name, email, password, role, changeLogId]
    );

    const { rows: [customer] } = await client.query(
        `INSERT INTO "customer"
            (customer_phone_number,
             customer_address,
             user_id,
             flag_deleted,
             history_id,
             change_log_id
            )
            VALUES ($1, $2, $3, false, NULL, $4)
            RETURNING
                customer_id AS "customerId",
                customer_phone_number AS "customerPhoneNumber";`,
        [phoneNumber, address, newUser.userId, changeLogId]
    );

    return {
        userId: newUser.userId,
        customerId: customer.customerId,
        userName: newUser.userName,
        userEmail: newUser.userEmail,
        customerPhoneNumber: customer.customerPhoneNumber
    }
}

export async function deleteCustomerDb(customer: any, userId: string, changeLogId: string) {

    let client: PoolClient | undefined;

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        await client.query(`
                    UPDATE "customer"
                    SET
                        flag_deleted = true,
                        change_log_id = $1
                    WHERE customer_id = $2
                `, [changeLogId, customer.customer_id]);

        await client.query(
            `INSERT INTO "customer"
                (customer_phone_number, 
                customer_address,
                user_id,
                flag_deleted,  
                history_id,
                change_log_id)
                VALUES ($1, $2, $3, false, $4, $5);`,
            [customer.customer_phone_number, customer.customer_address, userId, customer.customer_id, changeLogId]
        );

        await client.query('COMMIT');

        return {
            "deleted customer Id": customer.customer_id,
            changeLogId
        };

    } catch (error) {
        await client?.query('ROLLBACK');
        throw error;
    } finally {
        client?.release();
    }
}

export async function updateCustomerDetailsInCustomerTableDb(client: PoolClient, setClause: string, values: any[], customer: any, userId: string, changeLogId: string) {

    const {
        rows: [updatedCustomer],
    } = await client.query(
        `UPDATE "customer"
             SET ${setClause}
             WHERE customer_id = $${values.length}
             RETURNING *`,
        values
    );

    await client.query(
        `INSERT INTO "customer"
                (customer_phone_number, 
                customer_address,
                user_id,
                flag_deleted,  
                history_id,
                change_log_id)
                VALUES ($1, $2, $3, false, $4, $5);`,
        [customer.customer_phone_number, customer.customer_address, userId, customer.customer_id, changeLogId]
    );

    return updatedCustomer;
}

export async function updateCustomerDetailsInUserTableDb(client: PoolClient, setClause: string, values: any[], user: any, userId: string, changeLogId: string) {

    const {
        rows: [updatedUser],
    } = await client.query(
        `UPDATE "user"
             SET ${setClause}
             WHERE user_id = $${values.length}
             RETURNING *`,
        values
    );

    await client.query(
        `INSERT INTO "user"
                (user_name, 
                user_email,
                user_password,
                user_role,
                flag_deleted,  
                history_id,
                change_log_id)
                VALUES ($1, $2, $3, $4, false, $5, $6);`,
        [user.user_name, user.user_email, user.user_password, user.user_role, user.user_id, changeLogId]
    );

    return updatedUser;
}