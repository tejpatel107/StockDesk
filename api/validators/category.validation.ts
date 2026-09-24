import z from "zod";
import { AT_LEAST_ONE_FIELD, atLeastOneField, paramIdValidationSchema } from "./common.validation.js";

export const categoryIdParamValidationSchema = paramIdValidationSchema("id");

// category_name is varchar(100); category_description is NOT NULL text, so absent -> "".
export const addCategoryValidationSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    description: z.string().trim().max(2000).default("")
  })
  .strict();

export const updateCategoryValidationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  description: z.string().trim().max(2000).optional()
}).refine(atLeastOneField, AT_LEAST_ONE_FIELD);