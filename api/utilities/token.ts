import "dotenv/config";
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET_KEY;

export const generateJwtToken = async (payload : any) => {
    return jwt.sign(payload, jwtSecret as string);
} 
