import "dotenv/config";
import jwt, { type Jwt, type JwtPayload } from 'jsonwebtoken';

const jwtSecret : string = process.env.JWT_SECRET_KEY || " ";

export const generateJwtToken = async (payload : any) : Promise<string> => {
    return jwt.sign(payload, jwtSecret as string);
} 

export const verifyJwt = async (token : string) : Promise<string | JwtPayload> => {
    return jwt.verify(token, jwtSecret);
}