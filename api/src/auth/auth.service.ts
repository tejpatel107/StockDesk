import type { Request } from "express";
import { addNewUserDb, getUserByEmailDb } from "./auth.db.js";
import { hashPassword, verifyPassword } from "../../utilities/hash.js";
import { generateJwtToken } from "../../utilities/token.js";
import { ROLES } from "../../../db/roles.js";
import { randomUUID } from "node:crypto";
import { addNewCustomerDb } from "../customer/customer.db.js";


export async function loginService(req: Request) {

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

    return {
        statusCode: 200,
        data: {
            success: true,
            message: "logged in successfully!",
            jwt: token
        }
    }
}

export async function registerService(req: Request) {

    const { firstName, lastName, email, password, phoneNumber, address, role } = req.body;
    let user = await getUserByEmailDb(email);

    console.log(phoneNumber);

    if (user) {
        return {
            statusCode: 409,
            data: {
                success: false,
                error: `User with email ${email} already exists!`
            }
        }
    }

    const hashedPassword = await hashPassword(password);
    const userId = randomUUID();

    if (role === ROLES.CUSTOMER) {
        user = await addNewCustomerDb(randomUUID(), userId, (firstName as string).concat(" ",lastName as string), email, phoneNumber, address, hashedPassword, ROLES.CUSTOMER);
    }
    else {
        user = await addNewUserDb(userId, firstName + " " + lastName, email, hashedPassword, role);
    }

    return {
        statusCode: 201,
        data: {
            success: true,
            message: "user registered successfully!",
        }
    }

}