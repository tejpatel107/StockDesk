import express, { type Router } from "express";
import { loginController, signupController } from "./auth.controller.js";
import { validateLoginRequest, validateSingUpRequest } from "../../middlewares/auth.middleware.js";

const authRouter : Router = express.Router();

authRouter.post("/login", validateLoginRequest, loginController);
authRouter.post("/signup", validateSingUpRequest, signupController);

export default authRouter;