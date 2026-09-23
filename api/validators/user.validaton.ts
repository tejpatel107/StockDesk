import { z } from "zod";
import { roles } from "../../db/roles.js";

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

const addressValidation = z.object({
    unitNumber : z.number().optional(),
    streetNumber : z.number().optional(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
});

export const signUpValidation = z.object({
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    phoneNumber : z.e164(),
    address: addressValidation.optional(),
    role: z.enum(roles),
    password: passwordValidation
});

export const loginValidation = z.object({
    email: z.email(),
    password: passwordValidation
});