import type { Request, Response } from "express";
import { addNewUserDb, getUserByEmailDb } from "./auth.db.js";
import { hashPassword, verifyPassword } from "../../utilities/hash.js";
import { generateJwtToken } from "../../utilities/token.js";
import { ROLES } from "../../../db/roles.js";
import { randomUUID } from "node:crypto";
import { addNewCustomerDb, getCustomerByPhoneNumberDb } from "../customer/customer.db.js";
import { AppError, ConflictError } from "../../utilities/globalErrorHandlers.js";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { SYSTEM_USER_ID } from "../../config/system.js";
import { pool } from "../../../db/db.js";


export async function loginService(req: Request, res: Response) {

    const { email, password } = req.body;
    const user = await getUserByEmailDb(email);

    if (!user) {
        return {
            statusCode: 403,
            data: {
                success: false,
                error: `User for the email ${email} does not exists, enter correct email you used for signup`
            }
        }
    }

    if (! await verifyPassword(password, user.password)) {
        return {
            statusCode: 403,
            data: {
                success: false,
                error: "Password is wrong, please enter correct password"
            }
        };
    }

    const token = await generateJwtToken({ userId: user.id, role: user.role });

    res.cookie("session", token, {
        httpOnly: true,
        secure: process.env.ENV == "production" ? true : false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
        statusCode: 200,
        data: {
            success: true,
            message: "logged in successfully!",
            jwt: token,
            isStaff: user.role === ROLES.ADMIN || user.role === ROLES.STAFF 
        }
    }
}

export async function signupService(req: Request) {

    const { firstName, lastName, email, password, phoneNumber, address, role } = req.body;
    let user = await getUserByEmailDb(email);

    if (role === ROLES.SYSTEM) {
        throw new AppError(`User cannot have SYSTEM role, valid roles for user are 'ADMIN', 'STAFF', 'CUSTOMER'`);
    }

    if (user) {
        throw new ConflictError(`User with email ${email} already exists!`);
    }

    const hashedPassword = await hashPassword(password);

    const { rows: [changeLog] } = await insertNewChangeLogRecord(SYSTEM_USER_ID);

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        if (role === ROLES.CUSTOMER) {

            const { rows: [customer] } = await getCustomerByPhoneNumberDb(phoneNumber);

            if (customer && customer.phoneNumber === phoneNumber)
                throw new ConflictError(`Customer with existing phone number : ${phoneNumber} exists. Please try signing with another number`);

            user = await addNewCustomerDb(client, (firstName as string).concat(" ", lastName as string), email, phoneNumber, address, hashedPassword, ROLES.CUSTOMER, changeLog.change_log_id);
        }
        else {
            user = await addNewUserDb(client, (firstName as string).concat(" ", lastName as string), email, hashedPassword, role, changeLog.change_log_id);
        }

        await client.query('COMMIT');

        return {
            statusCode: 201,
            data: {
                success: true,
                message: "user registered successfully!",
                data: user
            }
        }

    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        client.release();
    }
}

