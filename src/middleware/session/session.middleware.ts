import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as session from 'express-session';
import { SESSION_SECRET } from './session.constant';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
    
    constructor(private readonly configService: ConfigService){
    }

    use(req: Request, res: Response, next: NextFunction): void {
        const sessionSecret = this.configService.get('app.sessionSecret') || SESSION_SECRET;
        session ({
            secret: sessionSecret,
            resave: false,
            saveUninitialized: false
        })(
            req,
            res,
            next
        );
    }
}
