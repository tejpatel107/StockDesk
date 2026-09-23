import { z } from "zod";

export enum ORDER_STATUSES {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    SHIPPING = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled"
}

export const getOrdersQuerySchema = z
    .object({
        status: z.enum(ORDER_STATUSES).optional(),
        startDate: z.string().date().optional(),
        endDate: z.string().date().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .refine(
        (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
        { message: "startDate must be before or equal to endDate", path: ["startDate"] }
    );

export type OrderSchema = z.infer<typeof getOrdersQuerySchema>;