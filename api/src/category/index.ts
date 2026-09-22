import express, { type Router } from "express";
import { getCategoriesController, addNewCategoryController, deleteCategoryController, updateCategoryController } from "./category.controller.js";

const categoryRouter : Router = express.Router();

categoryRouter.get("/", getCategoriesController);
categoryRouter.post("/", addNewCategoryController);
categoryRouter.delete("/:id", deleteCategoryController);
categoryRouter.patch("/:id", updateCategoryController);

export default categoryRouter;