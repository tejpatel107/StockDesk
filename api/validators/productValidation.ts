import z from "zod";
import { AT_LEAST_ONE_FIELD, atLeastOneField, moneyValidationSchema, paramIdValidationSchema } from "./common.validation.js";

const PG_INT_MAX = 2_147_483_647;

const name = z.string().trim().min(1, "Name is required").max(100);
const sku = z.string().trim().min(1, "SKU is required").max(100);
const quantity = z.number().int("Must be a whole number").min(0, "Stock can't be negative").max(PG_INT_MAX);

export const productIdParamValidationSchema = paramIdValidationSchema("id");

export const addProductValidationSchema = z.object({
    name, sku, price: moneyValidationSchema, quantity, catgoeryId: z.uuid()
});

export const updateProductValidationSchema = addProductValidationSchema
    .partial()
    .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

export const csvRowValidationSchema = z.object({
    name: z.string().trim().min(1, "name is required").max(100, "name exceeds 100 characters"),
    sku: z.string().trim().min(1, "sku is required").max(100, "sku exceeds 100 characters"),
    // product_price is numeric(10,0) in schema.sql, so whole numbers only
    price: z.string().trim().regex(/^\d{1,10}$/, "price must be a whole number (max 10 digits)"),
    quantity: z.string().trim().regex(/^\d{1,9}$/, "quantity must be a non-negative integer"),
    category_id: z.string().trim().uuid("category_id must be a valid UUID"),
});