import express, { type Router } from "express";
import { deleteCustomerController, getCustomersController, updateCustomerController } from "./customer.controller.js";

const customerRouter : Router = express.Router();

customerRouter.get("/", getCustomersController);
customerRouter.delete("/:id", deleteCustomerController);
customerRouter.patch("/:id", updateCustomerController);

export default customerRouter;