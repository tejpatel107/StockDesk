import { number, uuid, z } from "zod";
import { paramIdValidationSchema } from "./common.validation.js";

export const orderParamIdValidationSchema = paramIdValidationSchema("id");

export enum ORDER_STATUSES {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    SHIPPED = "SHIPPED",
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

const orderItemValidationSchema = z
    .object({
        productId: z.uuid(),
        quantity: z.number().int().min(1)
    });

export const addNewOrderValidationSchema = z
    .object({
        customerId : uuid(),
        items: z.array(orderItemValidationSchema)
    });

export const updateOrderValidationSchema = z.object({
    status: z.enum(ORDER_STATUSES)
});

export type OrderSchema = z.infer<typeof getOrdersQuerySchema>;