import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../utilities/globalErrorHandlers.js";

type Location = "params" | "query" | "body";

export interface ValidationDetail {
    location: Location;
    field: string;
    message: string;
}


type Schemas = Partial<Record<Location, ZodType>>;

export const validate =
    (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {

        const errors: ValidationDetail[] = [];
        const parsed: Partial<Record<Location, unknown>> = {};

        for (const location of ["params", "query", "body"] as const) {
            const schema = schemas[location];
            if (!schema) continue;

            const result = schema.safeParse(req[location]);
            if (result.success) {
                parsed[location] = result.data;
            } else {
                for (const issue of result.error.issues) {
                    errors.push({ location, field: issue.path.join("."), message: issue.message });
                }
            }
        }

        // Report every problem at once (params + query + body), not just the first location.
        if (errors.length > 0) return next(new ValidationError(errors));

        // Replace raw input with the parsed values so handlers get trimmed / coerced / defaulted data.
        if (parsed.params !== undefined) req.params = parsed.params as Request["params"];
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) {
            // req.query is a read-only getter in Express 5, so define it instead of assigning.
            Object.defineProperty(req, "query", {
                value: parsed.query,
                writable: true,
                configurable: true,
                enumerable: true,
            });
        }
        next();
    };

export { ValidationError };
