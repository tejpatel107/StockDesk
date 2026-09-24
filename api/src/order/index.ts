import express, { type Router } from "express";
import { getOrderByIdController, getOrdersController } from "./order.controller.js";

const orderRouter : Router = express.Router();

orderRouter.get("/", getOrdersController);
orderRouter.get("/:id", getOrderByIdController);
// orderRouter.post("/", addNewOrderController);
// orderRouter.delete("/:id", deleteOrderController);
// orderRouter.patch("/:id", updateOrderController);

export default orderRouter;