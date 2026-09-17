import { type Request, type Response } from "express";
import { loginService, registerService } from "./auth.service.js";

export async function login(req: Request, res: Response) {
    const result = await loginService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function signup(req: Request, res: Response) {
    const result = await registerService(req);
    return res.status(result?.statusCode as number).json(result?.data);
} 