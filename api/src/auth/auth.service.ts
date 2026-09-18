import type { Request } from "express";
import { createNewUser, getUserByEmail } from "./auth.db.js";
import { hashPassword, verifyPassword } from "../../utilities/hash.js";
import { generateJwtToken } from "../../utilities/token.js";


export async function loginService(req: Request) {

    const { email, password } = req.body;
    const user = await getUserByEmail(email);

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

    const { firstName, lastName, email, password, role } = req.body;
    let user = await getUserByEmail(email);

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

    user = await createNewUser( firstName + " " + lastName, email, hashedPassword, role);

    return {
        statusCode: 201,
        data: {
            success: true,
            message: "user registered successfully!",
        }
    }

}