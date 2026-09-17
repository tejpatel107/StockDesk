import type { UUID } from "node:crypto";
import type { roles } from "../../db/roles.js";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

// dotenv.config({
//     path: "../../.env",
// });

const jwtSecret =  process.env.JWT_SECRET_KEY || " ";

interface JwtPayload {
    userId: UUID,
    role: roles
}

interface AuthenticatedRequest extends Request {
    user?: JwtPayload
}

export function authenticateJwtToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {

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
        // Use `jwt.verify(token, secret)` from `jsonwebtoken` for signature
        const payload : JwtPayload = jwt.verify(token, jwtSecret) as JwtPayload;
        req.user = payload;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token"
        });
    }

}