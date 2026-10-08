import express, { type Router } from "express";
import { createNewOrderController, getOrderByIdForCustomerController, getOrderByIdForStaffController, getOrdersController, updateOrderController } from "./order.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { addNewOrderValidationSchema, orderParamIdValidationSchema, updateOrderValidationSchema } from "../../validators/order.validation.js";
import { ROLES } from "../../../db/roles.js";
import { authorizeUser } from "../../middlewares/auth.middleware.js";
import { cacheResponse } from "../../middlewares/cacheResponse.ts";

const orderRouter : Router = express.Router();

orderRouter.get("/", authorizeUser(ROLES.ADMIN, ROLES.STAFF), getOrdersController);
orderRouter.get("/:id", authorizeUser(ROLES.CUSTOMER), validate({ params: orderParamIdValidationSchema }), getOrderByIdForCustomerController);
orderRouter.get("/staff/:id", authorizeUser(ROLES.ADMIN, ROLES.STAFF), validate({ params: orderParamIdValidationSchema }), getOrderByIdForStaffController);
orderRouter.post("/", authorizeUser(ROLES.ADMIN, ROLES.STAFF, ROLES.CUSTOMER), validate({body : addNewOrderValidationSchema }) ,createNewOrderController);
orderRouter.patch("/:id", authorizeUser(ROLES.ADMIN, ROLES.STAFF), validate({params: orderParamIdValidationSchema, body : updateOrderValidationSchema }), updateOrderController);

export default orderRouter;