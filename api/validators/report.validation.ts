import z from "zod";

export const lowStockValidationSchema = z.object({
    threshold: z.coerce.number().nonnegative("Threshold cannot be a negative number.")
});


export const topProductsValidationSchema = z.object({
    limit: z.coerce.number().nonnegative("Limit cannot be a negative number.")
});