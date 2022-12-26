import {
    Injectable,
    NestMiddleware,
    ServiceUnavailableException,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { SettingService } from 'src/common/setting/services/setting.service';

@Injectable()
export class SettingMaintenanceMiddleware implements NestMiddleware {
    constructor(private readonly settingService: SettingService) {}

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const maintenance: boolean = await this.settingService.getMaintenance();

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
