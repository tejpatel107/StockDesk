import z from "zod";

export const lowStockValidationSchema = z.object({
    threshold: z.coerce.number().nonnegative("Threshold cannot be a negative number.")
});


export const topProductsValidationSchema = z.object({
    limit: z.coerce.number().nonnegative("Limit cannot be a negative number.")
});

const dateSchema = z
    .string()
    .optional()
    .refine((val) => val === undefined || !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
    })
    .transform((val) => (val ? new Date(val) : undefined));

export const salesSummaryValidationSchema = z
    .object({
        from: dateSchema,
        to: dateSchema,
    })
    .refine(
        (data) => !data.from || !data.to || data.from <= data.to,
        {
            message: '"from" date must be before or equal to "to" date',
            path: ['from'],
        }
    );
