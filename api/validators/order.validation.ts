import { z } from "zod";

export enum ORDER_STATUSES {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    SHIPPING = "SHIPPED",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED"
}

export const getOrdersQuerySchema = z
    .object({
        status: z.enum(ORDER_STATUSES).optional(),
        startDate: z.iso.date().optional(),
        endDate: z.iso.date().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
        sort: z.enum(["ASC", "DESC"]).default("DESC")
    })
    .refine(
        (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
        { message: "start date must be before or equal to end date", path: ["startDate"] }
    );

export type OrderSchema = z.infer<typeof getOrdersQuerySchema>;