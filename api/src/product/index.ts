import express, { type Router } from "express";
import { addNewProductController, deleteProductController, getProductByIdController, getProductsController, importProductsController, updateProductController } from "./product.controller.js";
import { importCsv } from "../../middlewares/multer.midddleware.js";
import { authorizeUser } from "../../middlewares/auth.middleware.js";
import { ROLES } from "../../../db/roles.js";
import { addProductValidationSchema, productIdParamValidationSchema, updateProductValidationSchema } from "../../validators/productValidation.js";
import { validate } from "../../middlewares/validate.middleware.js";

const productRouter : Router = express.Router();

productRouter.get("/", getProductsController);
productRouter.get("/:id", authorizeUser(ROLES.ADMIN,ROLES.STAFF), validate({ params : productIdParamValidationSchema }), getProductByIdController);
productRouter.post("/", authorizeUser(ROLES.ADMIN), validate({ body : addProductValidationSchema }) ,addNewProductController);
productRouter.delete("/:id", authorizeUser(ROLES.ADMIN), validate({ params : productIdParamValidationSchema }), deleteProductController);
productRouter.patch("/:id", authorizeUser(ROLES.ADMIN), validate({ params : productIdParamValidationSchema, body : updateProductValidationSchema }) ,updateProductController);
productRouter.post("/import", authorizeUser(ROLES.ADMIN), importCsv, importProductsController);
export default productRouter;