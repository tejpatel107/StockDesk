import { z } from "zod";
import { ROLES } from "../../db/roles.js";
import { addressValidation, paramIdValidationSchema, personNameValidationSchema } from "./common.validation.js";

const passwordValidation = z.string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(20, { message: "Password cannot exceed 20 characters" })
    .refine((val) => /[A-Z]/.test(val), {
        message: "Password must contain at least one uppercase letter",
    })
    .refine((val) => /[a-z]/.test(val), {
        message: "Password must contain at least one lowercase letter",
    })
    .refine((val) => /[0-9]/.test(val), {
        message: "Password must contain at least one number",
    })
    .refine((val) => /[^A-Za-z0-9]/.test(val), {
        message: "Password must contain at least one special character",
    });

const roleSchema = z.preprocess(
    (value) => (typeof value === "string" ? value.toUpperCase() : value),
    z.enum(ROLES)
);

export const signUpValidation = z.object({
    email: z.email(),
    firstName: personNameValidationSchema,
    lastName: personNameValidationSchema,
    phoneNumber: z.e164(),
    address: addressValidation.optional(),
    role: roleSchema,
    password: passwordValidation
});

export const loginValidation = z.object({
    email: z.email(),
    password: passwordValidation
});

export const updateCustomerDetailsValidationSchema = z.object({
    name: personNameValidationSchema.optional(),
    email: z.email().optional(),
    phoneNumer: z.e164().optional(),
    address: addressValidation.optional()
});

export const customerIdValidationSchema = paramIdValidationSchema("id");

export const customerQueryParamsValidationSchema = z.object({
    name: z.string().optional(),
    email: z.email().optional(),
    phoneNumber: z.e164().optional()
});