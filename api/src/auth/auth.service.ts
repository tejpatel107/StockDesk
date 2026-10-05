import type { Request, Response } from "express";
import { addNewUserDb, getUserByEmailDb } from "./auth.db.js";
import { hashPassword, verifyPassword } from "../../utilities/hash.js";
import { generateJwtToken } from "../../utilities/token.js";
import { ROLES } from "../../../db/roles.js";
import { addNewCustomerDb, getCustomerByPhoneNumberDb } from "../customer/customer.db.js";
import { AppError, AuthError, ConflictError, NotFoundError } from "../../utilities/globalErrorHandlers.js";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { SYSTEM_USER_ID } from "../../config/system.js";
import { pool } from "../../../db/db.js";


export async function loginService(req: Request, res: Response) {

    const { email, password } = req.body;
    const user = await getUserByEmailDb(email);

    if (!user) {
        throw new NotFoundError(`User for the email ${email} does not exists, enter correct email you used for signup`);
    }

    if (! await verifyPassword(password, user.password)) {
        throw new AuthError("Password is wrong, please enter correct password", 403);
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

export async function signupStaffService(req: Request) {

    const { firstName, lastName, email, password, role } = req.body;

    if (role === ROLES.SYSTEM || role === ROLES.CUSTOMER) {
        throw new AppError(`Staff user cannot have role ${role}, valid roles for staff users are 'ADMIN' and 'STAFF' only.`);
    }

    const user = await getUserByEmailDb(email);

    if (user) {
        throw new ConflictError(`User with email ${email} already exists!`);
    }

    const hashedPassword = await hashPassword(password);

    const client = await pool.connect();

    try {
        const { rows: [changeLog] } = await insertNewChangeLogRecord(SYSTEM_USER_ID, client);

        const { rows: [newUser] } = await addNewUserDb(client, (firstName as string).concat(" ", lastName as string), email, hashedPassword, role, changeLog.change_log_id);

        return {
            statusCode: 201,
            data: {
                success: true,
                message: "user registered successfully!",
                data: newUser
            }
        }
    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        client.release();

    }

}

export async function singupCustomerService(req: Request) {

    const userId = req.user?.userId;

    const { firstName, lastName, email, password, phoneNumber, address, role } = req.body;

    if (role === ROLES.SYSTEM || role === ROLES.ADMIN || role === ROLES.STAFF) {
        throw new AppError(`Invalid role ${role}, for customer. Customers can have only one role ${ROLES.CUSTOMER}.`);
    }

    const user = await getUserByEmailDb(email);

    if (user) {
        throw new ConflictError(`User with email ${email} already exists!`);
    }

    const { rows: [customer] } = await getCustomerByPhoneNumberDb(phoneNumber);

    if (customer)
        throw new ConflictError(`Customer with existing phone number : ${phoneNumber} exists. Please try signing with another number`);

    const hashedPassword = await hashPassword(password);
    const fullName = `${firstName} ${lastName}`;
    const client = await pool.connect();

    let changeLog = undefined;

    try {
        await client.query('BEGIN');

        if (userId) {
            const { rows } = await insertNewChangeLogRecord(userId, client);
            changeLog = rows[0];
        } else {
            const { rows } = await insertNewChangeLogRecord(SYSTEM_USER_ID, client);
            changeLog = rows[0];
        }

        const { rows: [newUser] } = await addNewUserDb(client, fullName, email, hashedPassword, role, changeLog.change_log_id);

        const newCustomer = await addNewCustomerDb(client, newUser, fullName, email, phoneNumber, address, hashedPassword, ROLES.CUSTOMER, changeLog.change_log_id);

        await client.query('COMMIT');

        return {
            statusCode: 201,
            data: {
                success: true,
                message: "customer registered successfully!",
                data: newCustomer
            }
        }

    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        client.release();
    }
}