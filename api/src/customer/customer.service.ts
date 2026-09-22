import type { Request } from "express";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { getAllCustomersDb, getCustomerByIdDb, getCustomerByPhoneNumberOrEmailOrNameDb } from "./customer.db.js";

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


// export async function updateCustomerService(req: Request) {
//     const userId: string = req.user?.userId;
//     const { id } = req.params;
//     const fields = req.body;

//     try {

//         let customer = await getCustomerByIdDb(id as string);

//         if (!customer) {
//             throw new Error("Customer does not exist, Please try to update existing Customer!");
//         }

//         const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;


//         customer = await updateCustomerDb(customer, userId, fields, changeLogId);

//         return {
//             statusCode: 200,
//             data: customer
//         };
//     } catch (error) {
//         return {
//             statusCode: 500,
//             data: {
//                 error: (error as any).message
//             }
//         };
//     }
// }

// export async function addNewCustomerService(req: Request) {

//     const { name, phoneNumber, email, address } = req.body;
//     const userId: string = req.user?.userId;

//     try {

//         let [customer] = await getCustomerByPhoneNumberOrEmailOrNameDb(phoneNumber);

//         if (customer.phone_number === phoneNumber) {
//             throw error("Customer already exists");
//         }

//         const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
//         customer = await addNewCustomerDb(randomUUID(), name, , userId, changeLogId);
//         return {
//             statusCode: 201,
//             data: { customer }
//         };
//     } catch (error) {
//         return {
//             statusCode: 500,
//             data: {
//                 error: (error as any).message
//             }
//         };
//     }
// }

export async function deleteCustomerService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;

    try {

        let Customer = await getCustomerByIdDb(id as string);

        if (!Customer) {
            throw new Error("Customer not found!");
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        Customer = await deleteCustomerDb(Customer, userId, changeLogId);
        console.log(Customer);

        if (!Customer) {
            throw error("Error deleting Customer.");
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
