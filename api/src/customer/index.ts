import express, { type Router } from "express";
import { addNewCustomerByStaffController, deleteCustomerController, getCustomersController, updateCustomerController } from "./customer.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { customerIdValidationSchema, customerQueryParamsValidationSchema, signUpValidation, updateCustomerDetailsValidationSchema } from "../../validators/user.validation.js";
import { attachCustomer, authorizeUser, requireOwnCustomer } from "../../middlewares/auth.middleware.js";
import { ROLES } from "../../../db/roles.js";

const customerRouter: Router = express.Router();

customerRouter.get("/", authorizeUser(ROLES.ADMIN, ROLES.STAFF), validate({ query: customerQueryParamsValidationSchema }), getCustomersController);
customerRouter.delete("/:id", validate({ params: customerIdValidationSchema }), authorizeUser(ROLES.CUSTOMER), attachCustomer({ required: true}), requireOwnCustomer(), deleteCustomerController);
customerRouter.patch("/:id", validate({ body: updateCustomerDetailsValidationSchema }), authorizeUser(ROLES.CUSTOMER), attachCustomer({ required: true}), requireOwnCustomer(), updateCustomerController);
customerRouter.post("/", authorizeUser(ROLES.ADMIN, ROLES.STAFF), validate({ body: signUpValidation }), addNewCustomerByStaffController);
export default customerRouter;