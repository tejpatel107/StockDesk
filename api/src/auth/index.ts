import express, { type Router } from "express";
import { loginController, signupController } from "./auth.controller.js";
import { loginValidation, signUpValidation } from "../../validators/user.validation.js";
import { validate } from "../../middlewares/validate.middleware.js";

const authRouter : Router = express.Router();

authRouter.post("/login", validate({ body : loginValidation }), loginController);
authRouter.post("/signup", validate({ body : signUpValidation }), signupController);

export default authRouter;