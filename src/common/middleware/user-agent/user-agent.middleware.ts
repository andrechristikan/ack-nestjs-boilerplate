import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import userAgentParserJs from 'ua-parser-js';

@Injectable()
export class UserAgentMiddleware implements NestMiddleware {
    use(req: IRequestApp, res: Response, next: NextFunction): void {
        // Put your specific user agent
        const userAgent: string = req.headers['user-agent'] as string;
        if (!userAgent) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_USER_AGENT_INVALID_ERROR,
                message: 'middleware.error.userAgentInvalid',
            });
        }

        req.userAgent = userAgentParserJs(userAgent);
        next();
    }
}
