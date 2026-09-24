import z, { uuid } from "zod";


export const atLeastOneField = (v: Record<string, unknown>) =>
    Object.values(v).some((x) => x !== undefined);

export const AT_LEAST_ONE_FIELD = { message: "At least one field must be provided" };

/** Route param schema, e.g. idParam("productId") for /products/:productId */
export const paramIdValidationSchema = (key: string) => z.object({ [key]: uuid() }).strict();

export const personNameValidationSchema = z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50, "Name must be at most 50 characters");

const hasMax2Decimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
export const moneyValidationSchema = z
    .number()
    .nonnegative("Must be 0 or more")
    .max(99_999_999.99, "Amount is too large")
    .refine(hasMax2Decimals, "At most 2 decimal places allowed");

export const paginationQueryValidationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listQueryValidationSchema = paginationQueryValidationSchema.extend({
  search: z.string().trim().max(100).optional(),
});