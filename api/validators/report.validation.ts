import z from "zod";

export const lowStockValidationSchema = z.object({
    threshold: z.coerce.number().nonnegative("Threshold cannot be less than")
});