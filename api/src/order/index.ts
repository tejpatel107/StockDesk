import express, { type Router } from "express";
import { createNewOrderController, getOrderByIdController, getOrdersController, updateOrderController } from "./order.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { addNewOrderValidationSchema, orderParamIdValidationSchema, updateOrderValidationSchema } from "../../validators/order.validation.js";

const orderRouter : Router = express.Router();

orderRouter.get("/", getOrdersController);
orderRouter.get("/:id", validate({ params: orderParamIdValidationSchema }) , getOrderByIdController);
orderRouter.post("/", validate({body : addNewOrderValidationSchema }) ,createNewOrderController);
orderRouter.patch("/:id", validate({params: orderParamIdValidationSchema, body : updateOrderValidationSchema }), updateOrderController);

export default orderRouter;