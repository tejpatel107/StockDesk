// src/middleware/cacheResponse.ts
// src/middleware/cacheResponse.ts
import type { Request, Response, NextFunction } from "express";
import { cache } from "../src/cache/cache.ts";

export const cacheResponse = (ttlMs = 60000) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();

    const key = req.url;
    const value = cache.get(key);
    if (value) {
      res.setHeader("X-Cache", "VALUE");
      return res.json(value);
    }

    const originalJson = res.json.bind(res);
    
    res.json = (body: unknown) => {
      if (res.statusCode === 200) {
        cache.set(key, body)
      };
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };
    next();
  };