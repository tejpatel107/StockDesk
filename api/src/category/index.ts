import express, { type Router } from "express";
import { getCategoriesController, addNewCategoryController, deleteCategoryController, updateCategoryController } from "./category.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { addCategoryValidationSchema, categoryIdParamValidationSchema, updateCategoryValidationSchema } from "../../validators/category.validation.js";

const categoryRouter : Router = express.Router();

categoryRouter.get("/", getCategoriesController);
categoryRouter.post("/", validate({ body : addCategoryValidationSchema }) ,addNewCategoryController);
categoryRouter.delete("/:id", validate({ params : categoryIdParamValidationSchema }) ,deleteCategoryController);
categoryRouter.patch("/:id", validate({ params : categoryIdParamValidationSchema, body : updateCategoryValidationSchema }), updateCategoryController);

export default categoryRouter;