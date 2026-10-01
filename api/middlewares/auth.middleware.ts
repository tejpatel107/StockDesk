import type { UUID } from "node:crypto";
import { ROLES } from "../../db/roles.js";
import type { NextFunction, Request, Response } from "express";
import "dotenv/config";
import { verifyJwt } from "../utilities/token.js";
import { AuthError } from "../utilities/globalErrorHandlers.js";
import { pool } from "../../db/db.js";

const jwtSecret = process.env.JWT_SECRET_KEY || " ";

interface JwtPayload {
    userId: UUID,
    role: ROLES
}

interface AuthenticatedRequest extends Request {
    user?: JwtPayload,
    customerId?: string
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

export function authorizeUser(...roles: ROLES[]) {

    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {


        if (!req.user) {
            return next(new AuthError("Unauthenticated, please login first!", 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AuthError("You are not authorized to access this reosurce.", 403));
        }
        
        next();
    }
}

export const attachCustomer =
    ({ required = true }: { required: boolean }) =>
        async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            try {
                if (req.user?.role !== ROLES.CUSTOMER) return next();

                const { rows } = await pool.query(
                    `SELECT customer_id FROM "customer"
          WHERE user_id = $1 AND flag_deleted = false`,
                    [req.user.userId]
                );

                if (rows[0]) {
                    req.customerId = rows[0].customer_id;
                } else if (required) {
                    return next(new AuthError("No customer profile exists for this account", 404));
                }
                next();
            } catch (err) {
                next(err);
            }
        };

export const requireOwnCustomer =
    (param = "id") =>
        (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            if (req.params[param] !== req.customerId) {
                return next(new AuthError("You are FORBIDDEN to manipulate data of other customers!", 403));
            }
            next();
        };
