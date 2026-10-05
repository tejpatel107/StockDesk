import type { Request } from "express";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { addNewCustomerDb, deleteCustomerDb, getAllCustomersDb, getCustomerByIdDb, getCustomerByPhoneNumberDb, getCustomerByPhoneNumberOrEmailOrNameDb, updateCustomerDetailsInCustomerTableDb, updateCustomerDetailsInUserTableDb } from "./customer.db.js";
import { pool } from "../../../db/db.js";
import { addNewUserDb, getUserByEmailDb, getUserByIdDb } from "../auth/auth.db.js";
import { AppError, ConflictError, NotFoundError } from "../../utilities/globalErrorHandlers.js";
import { hashPassword } from "../../utilities/hash.js";
import { nativeEnum } from "zod/v3";
import { ROLES } from "../../../db/roles.js";

type CustomerUpdate = Partial<{
    name: string,
    email: string,
    phoneNumber: string,
    address: string
}>

// Split by which table owns the column
const customerFieldMap = {
    phoneNumber: 'customer_phone_number',
    address: 'customer_address',
} as const;

const userFieldMap = {
    name: 'user_name',
    email: 'user_email',
} as const;

type CustomerKey = keyof typeof customerFieldMap;
type UserKey = keyof typeof userFieldMap;

export async function getAllCustomersService() {
    const { rows: categories } = await getAllCustomersDb();
    return {
        statusCode: 200,
        data: { count: categories.length, categories }
    };
}

export async function getCustomerByPhoneNumberOrEmailOrNameService(req: Request) {
    const { email, phoneNumber, name } = req.query;
    let customers = [];

    if (email) {
        const { rows } = await getCustomerByPhoneNumberOrEmailOrNameDb(email as string);
        customers = rows;
    }

    if (name) {
        const { rows } = await getCustomerByPhoneNumberOrEmailOrNameDb(name as string);
        customers = rows;
    }

    if (phoneNumber) {
        const { rows } = await getCustomerByPhoneNumberOrEmailOrNameDb(phoneNumber as string);
        customers = rows;
        console.log(customers);
    }

    return {
        statusCode: 200,
        data: { count: customers.length, customers }
    };
}

export async function updateCustomerService(req: Request) {
    const userId: string = req.user?.userId;
    const { id: customerId } = req.params;
    const updates = req.body as CustomerUpdate;
    const client = await pool.connect();

    try {

        let { rows: [customer] } = await getCustomerByIdDb(customerId as string);
        if (!customer) {
            throw new Error("Customer does not exist, Please try to update existing Customer!");
        }

        let user = await getUserByIdDb(userId as string);
        if (!user) {
            throw new NotFoundError("No user details found for the customer! Contact support.");
        }

        const customerKeys = Object.keys(updates).filter((key): key is CustomerKey => {
            return Object.hasOwn(customerFieldMap, key) && updates[key as CustomerKey] !== undefined && updates[key as CustomerKey] !== null
        });

        const userKeys = Object.keys(updates).filter((key): key is UserKey => {
            return Object.hasOwn(userFieldMap, key) && updates[key as UserKey] !== undefined && updates[key as UserKey] !== null
        });

        if (customerKeys.length === 0 && userKeys.length === 0) {
            throw new Error("No valid updates provided for updates!");
        }

        await client.query('BEGIN');

        const { rows : [changeLog] } = await insertNewChangeLogRecord(userId, client);

        if (customerKeys.length > 0) {

            const customerUpdateValues = [changeLog.change_log_id,
                ...customerKeys.map((key) => updates[key]),
                customerId];

            const customerUpdateSetClause = [
                `change_log_id = $1`,
                ...customerKeys.map((key, index) => `${customerFieldMap[key]} = $${index + 2}`)
            ].join(", ");

            console.log(customerKeys, customerUpdateValues, customerUpdateSetClause);

            customer = await updateCustomerDetailsInCustomerTableDb(client, customerUpdateSetClause, customerUpdateValues, customer, userId, changeLog.change_log_id);
        }

        if (userKeys.length > 0) {

            const userUpdateValues = [changeLog.change_log_id,
                ...userKeys.map((key) => updates[key]),
                userId];

            const userUpdateSetClause = [
                `change_log_id = $1`,
                ...userKeys.map((key, index) => `${userFieldMap[key]} = $${index + 2}`)
            ].join(", ");

            console.log(userKeys, userUpdateValues, userUpdateSetClause);

            user = await updateCustomerDetailsInUserTableDb(client, userUpdateSetClause, userUpdateValues, user, userId, changeLog.change_log_id);
        }

        await client.query('COMMIT');

        return {
            statusCode: 200,
            data: { ...customer, ...user }
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        await client.release();
    }
}

export async function deleteCustomerService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;

    let { rows: [customer] } = await getCustomerByIdDb(id as string);

    if (!customer) {
        throw new NotFoundError(`Customer does not exist for id: ${id}!`);
    }

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);

        customer = await deleteCustomerDb(client, customer, userId, changeLog.change_log_id);

        await client.query('COMMIT');

        return {
            statusCode: 204,
            data: customer
        };

    } catch (error: any) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    }
    finally {
        await client.release();
    }
}