import express, { type Router } from "express";
import { addNewProductController, deleteProductController, getProductsController, importProductsController, updateProductController } from "./product.controller.js";
import { importCsv } from "../../middlewares/multer.midddleware.js";

const productRouter : Router = express.Router();

productRouter.get("/", getProductsController);
productRouter.post("/", addNewProductController);
productRouter.delete("/:id", deleteProductController);
productRouter.patch("/:id", updateProductController);
productRouter.post("/import", importCsv ,importProductsController);
export default productRouter;