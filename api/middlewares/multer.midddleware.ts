import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer from "multer";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB, far above ~1,000 rows

const multerUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: 1 },
}).single("file");

export const importCsv: RequestHandler = (req: Request, res : Response, next: NextFunction) => {
  multerUpload(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      return res
        .status(tooBig ? 413 : 400)
        .json({ error: tooBig ? "File exceeds 5 MB limit" : "Invalid upload" });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (multipart field "file")' });
    }

    next();
  });
};