import { randomUUID, type UUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../../db/db.js";
import type { roles } from "../../../db/roles.js";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";

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
        WHERE customer_id = $1 AND (flag_deleted = false);
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

export async function addNewCustomerDb(customerId:string, userId: string, name: string, email: string, phoneNumber: string, address: string, password: string, role: roles) {

    const client = await pool.connect();
    try {

        await client.query('BEGIN');
        await client.query('SET CONSTRAINTS ALL DEFERRED');

        const { rows : [ changeLog ] } = await client.query(`
            INSERT INTO change_log (
                change_log_id,
                user_id,
                change_log_timestamp
            ) VALUES ( $1, $2, now())
            RETURNING *           
            `,
            [randomUUID(), userId]
        );

        await client.query(
            `INSERT INTO "user"
            (user_id, user_name, user_email, user_password, user_role, change_log_id, flag_deleted, history_id)
            VALUES ($1, $2, $3, $4, $5, $6, false, NULL)
            RETURNING
                user_id AS "userId",
                user_name AS "userName",
                user_email AS "userEmail",
                user_role AS "userRole";`,
            [userId, name, email, password, role, changeLog.change_log_id]
        );

        const res = await client.query(
            `INSERT INTO customer
            (customer_id,
             customer_phone_number,
             customer_address,
             user_id,
             flag_deleted,
             history_id,
             change_log_id
            )
            VALUES ($1, $2, $3, $4, false, NULL, $5)
            `, [customerId, phoneNumber, address, userId, changeLog.change_log_id]
        )

        await client.query('COMMIT');
        return res.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

}

// export async function deleteCustomerDb(category: any, userId: string, changeLogId: string) {

//     let client: PoolClient | undefined;

//     try {
//         client = await pool.connect();

//         await client.query('BEGIN');

//         await client.query(`
//                     UPDATE "category"
//                     SET
//                         flag_deleted = true,
//                         change_log_id = $1
//                     WHERE category_id = $2
//                 `, [changeLogId, category.category_id]);

//         const historyCategoryId = randomUUID();

//         await client.query(
//             `INSERT INTO "category"
//                 (category_id, 
//                 category_name, 
//                 category_description,
//                 flag_deleted, 
//                 change_log_id, 
//                 history_id)
//                 VALUES ($1, $2, $3, false, $4, $5)
//                 RETURNING
//                     category_id AS "categoryId",
//                     category_name AS "categoryName",
//                     category_description AS "cetgoryDescription";`,
//             [historyCategoryId, category.category_name, category.category_description, category.change_log_id, category.category_id]
//         );

//         await client.query('COMMIT');

//         return {
//             deletedCategoryId: category.category_id,
//             historyCategoryId,
//             changeLogId
//         };

//     } catch (error) {
//         await client?.query('ROLLBACK');
//         throw error;
//     } finally {
//         client?.release();
//     }
// }

// export async function updateCustomerDetailsInCustomerTableDb(setClause: string, values: any[], customer: any, userId: string, updates: CustomerUpdate, changeLogId: string) {

//     let client: PoolClient | undefined;

//     try {
//         client = await pool.connect();

//         const {
//             rows: [updatedCustomer],
//         } = await client.query(
//             `UPDATE "customer"
//              SET ${setClause}
//              WHERE customer_id = $${values.length}
//              RETURNING *`,
//             values
//         );

//         const historyCustomerId = randomUUID();

//         await client.query(
//             `INSERT INTO "customer"
//                 (customer_id, 
//                 customer_phone_number, 
//                 customer_address,
//                 user_id
//                 flag_deleted,  
//                 history_id,
//                 change_log_id)
//                 VALUES ($1, $2, $3, $4, false, $5, $6)
//                 RETURNING
//                     customer_id AS "customerId",
//                     customer_phone_number AS "customerPhoneNumber",
//                     customer_address AS "customerAddress";`,
//             [historyCustomerId, customer.customer_phone_number, customer.customer_address, userId, customer.customer_id, changeLogId]
//         );

//         await client.query("COMMIT");

//         return updatedCustomer;

//     } catch (error) {
//         await client?.query("ROLLBACK");
//         throw error;
//     } finally {
//         client?.release();
//     }
// }

// export async function updateCustomerDetailsInUserTableDb(user: any, userId: string, updates: CustomerUpdate, changeLogId: string) {

//     const keys = (Object.keys(updates)).filter((key): key is UserKey => {
//         return Object.hasOwn(userFieldMap, key) && (updates[key as UserKey] !== undefined || updates[key as UserKey] !== null)
//     });

//     if (keys.length === 0) {
//         throw new Error("No valid fields provided for update");
//     }

//     const values = [changeLogId, ...keys.map((k) => updates[k]), userId];
//     console.log(values);

//     const setClause = [
//         "change_log_id = $1",
//         ...keys.map((k, i) => `${userFieldMap[k]} = $${i + 2}`),
//     ].join(", ");
//     console.log(setClause);

//     let client: PoolClient | undefined;

//     try {
//         client = await pool.connect();

//         const {
//             rows: [updatedUser],
//         } = await client.query(
//             `UPDATE "user"
//              SET ${setClause}
//              WHERE user_id = $${values.length}
//              RETURNING *`,
//             values
//         );

//         const historyUserId = randomUUID();

//         await client.query(
//             `INSERT INTO "user"
//                 (user_id, 
//                 user_name, 
//                 user_email,
//                 user_password,
//                 user_role
//                 flag_deleted,  
//                 history_id,
//                 change_log_id)
//                 VALUES ($1, $2, $3, $4, $5, false, $6, $7)
//                 RETURNING
//                     customer_id AS "customerId",
//                     customer_phone_number AS "customerPhoneNumber",
//                     customer_address AS "customerAddress";`,
//             [historyUserId, user.user_name, user.user_email, user.user_password, user.user_role, user.user_id,changeLogId]
//         );

//         await client.query("COMMIT");

//         return updatedUser;

//     } catch (error) {
//         await client?.query("ROLLBACK");
//         throw error;
//     } finally {
//         client?.release();
//     }
// }