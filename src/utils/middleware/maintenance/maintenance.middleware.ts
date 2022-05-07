import {
    Injectable,
    NestMiddleware,
    ServiceUnavailableException,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { SettingDocument } from 'src/setting/schema/setting.schema';
import { SettingService } from 'src/setting/service/setting.service';
import { ENUM_STATUS_CODE_ERROR } from 'src/utils/error/error.constant';
import { IRequestApp } from 'src/utils/request/request.interface';

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
                statusCode: ENUM_STATUS_CODE_ERROR.SERVICE_UNAVAILABLE,
                message: 'http.serverError.serviceUnavailable',
            });
        }

        next();
    }
}
