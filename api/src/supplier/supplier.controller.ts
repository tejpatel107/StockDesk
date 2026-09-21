import { type Request, type Response } from "express";
import { getAllSuppliersService, deleteSupplierService, updateSupplierService, addNewSupplierService, getSuppliersByNameService } from "./supplier.service.js";

export async function getSuppliersController(req: Request, res: Response) {
    const { search } = req.query;

    if (typeof search === "string" && search.length > 0) {
        return await getSupplierByName(req, res);
    } 

    return await getAllSupplier(req, res);

}

async function getAllSupplier(req: Request, res: Response) {
    const result = await getAllSuppliersService();
    return res.status(result?.statusCode as number).json(result?.data);
};

async function getSupplierByName(req: Request, res: Response) {
    const result = await getSuppliersByNameService(req);
    return res.status(result?.statusCode as number).json(result?.data);
};

export async function addNewSupplierController(req: Request, res: Response) {
    const result = await addNewSupplierService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function deleteSupplierController(req: Request, res: Response){
    const result = await deleteSupplierService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}

export async function updateSupplierController(req: Request, res: Response) {
    const result = await updateSupplierService(req);
    return res.status(result?.statusCode as number).json(result?.data);
}