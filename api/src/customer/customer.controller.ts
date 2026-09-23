import { type Request, type Response } from "express";
import { deleteCustomerService, getAllCustomersService, getCustomerByPhoneNumberOrEmailOrNameService, updateCustomerService } from "./customer.service.js";

export async function getCustomersController(req: Request, res: Response) {
    const { search } = req.query;

    if (typeof search === "string" && search.length > 0) {
        return await getCustomerByName(req, res);
    } 

    return await getAllCustomers(req, res);

}

async function getAllCustomers(req: Request, res: Response) {
    const result = await getAllCustomersService();
    return res.status(result?.statusCode as number).json(result?.data);
};

async function getCustomerByName(req: Request, res: Response) {
    const result = await getCustomerByPhoneNumberOrEmailOrNameService(req);
    return res.status(result?.statusCode as number).json(result?.data);
};

// export async function addNewCustomerController(req: Request, res: Response) {
//     const result = await addNewCustomerService(req);
//     return res.status(result?.statusCode as number).json(result?.data);
// }

export async function deleteCustomerController(req: Request, res: Response){
    const result = await deleteCustomerService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function updateCustomerController(req: Request, res: Response) {
    const result = await updateCustomerService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}