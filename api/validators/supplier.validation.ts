import z from "zod";
import { atLeastOneField, AT_LEAST_ONE_FIELD, paramIdValidationSchema } from "./common.validation.js";


export const supplierIdParamValidationSchema = paramIdValidationSchema("id");
 
// supplier_name varchar(100), supplier_email varchar(100), supplier_phone_number varchar(25) - all NOT NULL
export const addSupplierValidationSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.email(),
    phoneNumber: z.e164(),
  })
  .strict();
 
export const updateSupplierValidationSchema = addSupplierValidationSchema
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);