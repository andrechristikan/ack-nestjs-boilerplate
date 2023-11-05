import {
    Injectable,
    NestMiddleware,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class AppMaintenanceMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const maintenance: boolean =
            this.configService.get<boolean>('app.maintenance');

        if (maintenance) {
            throw new ServiceUnavailableException({
                statusCode:
                    ENUM_ERROR_STATUS_CODE_ERROR.ERROR_SERVICE_UNAVAILABLE,
                message: 'http.serverError.serviceUnavailable',
            });
        }

        next();
    }
}
