import type { Request } from "express";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { deleteCustomerDb, getAllCustomersDb, getCustomerByIdDb, getCustomerByPhoneNumberOrEmailOrNameDb, updateCustomerDetailsInCustomerTableDb, updateCustomerDetailsInUserTableDb } from "./customer.db.js";
import { pool } from "../../../db/db.js";
import { getUserByIdDb } from "../auth/auth.db.js";

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

    try {
        const categories = await getAllCustomersDb();
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


export async function getCustomerByPhoneNumberOrEmailOrNameService(req: Request) {

    const { search } = req.query;

    try {
        const customers = await getCustomerByPhoneNumberOrEmailOrNameDb((search as string).trim());
        return {
            statusCode: 200,
            data: { count: customers.length, customers }
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


export async function updateCustomerService(req: Request) {
    const userId: string = req.user?.userId;
    const { id: customerId } = req.params;
    const updates = req.body as CustomerUpdate;
    const client = await pool.connect();

    try {

        let customer = await getCustomerByIdDb(customerId as string);
        if (!customer) {
            throw new Error("Customer does not exist, Please try to update existing Customer!");
        }

        let user = await getUserByIdDb(userId as string);
        if (!user) {
            throw new Error("No user details found for the customer! Contact support.");
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

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;

        await client.query('BEGIN');

        if (customerKeys.length > 0) {

            const customerUpdateValues = [changeLogId,
                ...customerKeys.map((key) => updates[key]),
                customerId];

            const customerUpdateSetClause = [
                `change_log_id = $1`,
                ...customerKeys.map((key, index) => `${customerFieldMap[key]} = $${index + 2}`)
            ].join(", ");

            console.log(customerKeys, customerUpdateValues, customerUpdateSetClause);

            customer = await updateCustomerDetailsInCustomerTableDb(client, customerUpdateSetClause, customerUpdateValues, customer, userId, changeLogId);
        }

        if (userKeys.length > 0) {

            const userUpdateValues = [changeLogId,
                ...userKeys.map((key) => updates[key]),
                userId];

            const userUpdateSetClause = [
                `change_log_id = $1`,
                ...userKeys.map((key, index) => `${userFieldMap[key]} = $${index + 2}`)
            ].join(", ");

            console.log(userKeys, userUpdateValues, userUpdateSetClause);

            user = await updateCustomerDetailsInUserTableDb(client, userUpdateSetClause, userUpdateValues, user, userId, changeLogId);
        }

        await client.query('COMMIT');

        return {
            statusCode: 200,
            data: { ...customer, ...user }
        };

    } catch (error) {
        await client.query('ROLLBACK');
        return {
            statusCode: 500,
            data: {
                error: error.message
            }
        };
    } finally {
        await client.release();
    }
}

export async function deleteCustomerService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;
    console.log(req.customerId);
    try {

        let customer = await getCustomerByIdDb(id as string);

        if (!customer) {
            throw new Error("Customer does not exist!");
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        console.log(customer.customer_phone_number);

        customer = await deleteCustomerDb(customer, userId, changeLogId);

        if (!customer) {
            throw Error("Error deleting Customer.");
        }

        return {
            statusCode: 204,
        };

    } catch (error: any) {
        return {
            statusCode: 500,
            data: {
                error: error.message
            }
        };
    }
}
