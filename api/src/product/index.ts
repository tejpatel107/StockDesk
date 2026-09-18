import express, { type Router } from "express";
import { addNewProductController, deleteProductController, getProductsController } from "./product.controller.js";

const productRouter : Router = express.Router();

productRouter.get("/", getProductsController);
productRouter.post("/", addNewProductController);
productRouter.delete("/", deleteProductController);

export default productRouter;