import express, { type Router } from "express";
import { getCustomersController } from "./customer.controller.js";

const customerRouter : Router = express.Router();

customerRouter.get("/", getCustomersController);
// customerRouter.post("/", addNewCustomerController);
// customerRouter.delete("/:id", deleteCustomerController);
// customerRouter.patch("/:id", updateCustomerController);

export default customerRouter;