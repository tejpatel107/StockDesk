import express, { type Router } from "express";
import { addNewSupplierController, deleteSupplierController, getSuppliersController, updateSupplierController } from "./supplier.controller.js";
import { authorizeUser } from "../../middlewares/auth.middleware.js";
import { ROLES } from "../../../db/roles.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { addSupplierValidationSchema, supplierIdParamValidationSchema, updateSupplierValidationSchema } from "../../validators/supplier.validation.js";

const supplierRouter : Router = express.Router();

supplierRouter.get("/", authorizeUser(ROLES.ADMIN, ROLES.STAFF), getSuppliersController);
supplierRouter.post("/", authorizeUser(ROLES.ADMIN), validate({ body : addSupplierValidationSchema }), addNewSupplierController);
supplierRouter.delete("/:id", authorizeUser(ROLES.ADMIN), validate({ params: supplierIdParamValidationSchema }), deleteSupplierController);
supplierRouter.patch("/:id", authorizeUser(ROLES.ADMIN), validate({ params: supplierIdParamValidationSchema, body: updateSupplierValidationSchema }), updateSupplierController);

export default supplierRouter;