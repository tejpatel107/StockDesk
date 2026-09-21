import express, { type Router } from "express";
import { addNewSupplierController, deleteSupplierController, getSuppliersController, updateSupplierController } from "./supplier.controller.js";

const supplierRouter : Router = express.Router();

supplierRouter.get("/", getSuppliersController);
supplierRouter.post("/", addNewSupplierController);
supplierRouter.delete("/:id", deleteSupplierController);
supplierRouter.patch("/:id", updateSupplierController);

export default supplierRouter;