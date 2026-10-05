import { type Request, type Response } from "express";
import { deleteCustomerService, getAllCustomersService, getCustomerByPhoneNumberOrEmailOrNameService, updateCustomerService } from "./customer.service.js";
import { singupCustomerService } from "../auth/auth.service.js";

export async function getCustomersController(req: Request, res: Response) {
    const { name, email, phoneNumber } = req.query;

    if ((typeof name === "string" && name.length > 0) ||
        (typeof email === "string" && email.length > 0) ||
        (typeof phoneNumber === "string" && phoneNumber.length > 0)) {
        return await getCustomerByPhoneNumberOrEmailOrName(req, res);
    }

    return await getAllCustomers(req, res);

}

async function getAllCustomers(req: Request, res: Response) {
    const result = await getAllCustomersService();
    return res.status(result?.statusCode as number).json(result?.data);
};

async function getCustomerByPhoneNumberOrEmailOrName(req: Request, res: Response) {
    const result = await getCustomerByPhoneNumberOrEmailOrNameService(req);
    return res.status(result?.statusCode as number).json(result?.data);
};

export async function addNewCustomerByStaffController(req: Request, res: Response) {
    const result = await singupCustomerService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function deleteCustomerController(req: Request, res: Response) {
    const result = await deleteCustomerService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function updateCustomerController(req: Request, res: Response) {
    const result = await updateCustomerService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}