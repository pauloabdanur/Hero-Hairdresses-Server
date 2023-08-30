import { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { IPayload } from '../interfaces/UsersInterface';

class AuthMiddleware {
  auth(request: Request, response: Response, next: NextFunction) {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return response.status(401).json({
        code: 'token.missing',
        message: 'Missing Token',
      });
    }
    //Authorization: Bearer *token*
    const [, token] = authHeader.split(' ');
    let secretKey: string | undefined = process.env.ACCESS_KEY_TOKEN;

    if (!secretKey) {
      throw new Error('No token key found');
    }

    try {
      const { sub } = verify(token, secretKey) as IPayload;

      request.user_id = sub;
      return next();
    } catch (error) {
      return response.status(401).json({
        code: 'token.expired',
        message: 'Token expired',
      });
    }
  }
}

export { AuthMiddleware };
