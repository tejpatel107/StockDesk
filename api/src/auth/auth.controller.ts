import { type Request, type Response } from "express";
import { loginService, signupStaffService, singupCustomerService } from "./auth.service.js";

export async function loginController(req: Request, res: Response) {
    const result = await loginService(req, res);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function signupStaffController(req: Request, res: Response) {
    const result = await signupStaffService(req);
    return res.status(result?.statusCode as number).json(result?.data);
} 

export async function signupCustomerController(req: Request, res: Response) {
    const result = await singupCustomerService(req);
    return res.status(result?.statusCode as number).json(result?.data);
} 