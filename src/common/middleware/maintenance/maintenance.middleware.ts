import {
    Injectable,
    NestMiddleware,
    ServiceUnavailableException,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { SettingDocument } from 'src/common/setting/schemas/setting.schema';
import { SettingService } from 'src/common/setting/services/setting.service';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
    constructor(private readonly settingService: SettingService) {}

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const maintenance: SettingDocument =
            await this.settingService.findOneByName('maintenance');

        if (maintenance.value as boolean) {
            throw new ServiceUnavailableException({
                statusCode:
                    ENUM_ERROR_STATUS_CODE_ERROR.ERROR_SERVICE_UNAVAILABLE,
                message: 'http.serverError.serviceUnavailable',
            });
        }

        next();
    }
}
