import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/utils/request/request.constant';
import { IRequestApp } from 'src/utils/request/request.interface';
import userAgentParser from 'ua-parser-js';

@Injectable()
export class UserAgentMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: IRequestApp, res: Response, next: NextFunction): void {
        const mode: string = this.configService.get<string>('app.mode');

        if (mode === 'secure') {
            // Put your specific user agent
            const userAgent: string = req.headers['user-agent'] as string;
            if (!userAgent) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_INVALID_ERROR,
                    message: 'middleware.error.userAgentInvalid',
                });
            }
        }
        req.userAgent = userAgentParser(req.headers['user-agent']);
        next();
    }
}
