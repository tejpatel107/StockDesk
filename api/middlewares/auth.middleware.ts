import type { UUID } from "node:crypto";
import type { roles } from "../../db/roles.js";
import type { NextFunction, Request, Response } from "express";
import "dotenv/config";
import { loginValidation, signUpValidation } from "../validators/user.validaton.js";
import { verifyJwt } from "../utilities/token.js";

const jwtSecret =  process.env.JWT_SECRET_KEY || " ";

interface JwtPayload {
    userId: UUID,
    role: roles
}

interface AuthenticatedRequest extends Request {
    user?: JwtPayload
}

export async function authenticateJwtToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: "Authorization header is missing"
        });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            error: "Invalid authorization format"
        });
    }

    try {
        const payload = await verifyJwt(token) as JwtPayload;
        req.user = payload;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token"
        });
    }

}

export function validateSingUpRequest(req: Request, res: Response, next: NextFunction) {

    const result = signUpValidation.safeParse(req.body);

    if (result.error) {
        return res.status(400).json({
            error : result.error
        });
    }

    req.body = result.data;
    next();
}

export function validateLoginRequest(req: Request, res: Response, next: NextFunction) {

    const result = loginValidation.safeParse(req.body);

    if (result.error) {
        return res.status(400).json({
            error : result.error
        });
    }

    req.body = result.data;
    next();
}