import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiResponseBodyMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        const send: any = res.send;
        const resOld: any = res;

        // Add response data to response
        resOld.send = (body: any) => {
            resOld.body = body;
            resOld.send = send;
            resOld.send(body);
            res = resOld as Response;
        };

        next();
    }
}
