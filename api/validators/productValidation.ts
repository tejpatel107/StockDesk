import z from "zod";
import { AT_LEAST_ONE_FIELD, atLeastOneField, moneyValidationSchema, paramIdValidationSchema } from "./common.validation.js";

const PG_INT_MAX = 2_147_483_647;

const name = z.string().trim().min(1, "Name is required").max(100);
const sku = z.string().trim().min(1, "SKU is required").max(100);
const quantity = z.number().int("Must be a whole number").min(0, "Stock can't be negative").max(PG_INT_MAX);

export const supplierIdParam = paramIdValidationSchema("id");

export const addProductValidationSchema = z.object({
    name, sku, price: moneyValidationSchema, quantity, catgoeryId: z.uuid()
});

export const updateProductValidationSchema = addProductValidationSchema
    .partial()
    .refine(atLeastOneField, AT_LEAST_ONE_FIELD);