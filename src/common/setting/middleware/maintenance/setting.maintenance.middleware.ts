import {
    Injectable,
    NestMiddleware,
    ServiceUnavailableException,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingUseCase } from 'src/common/setting/use-cases/setting.use-case';

@Injectable()
export class SettingMaintenanceMiddleware implements NestMiddleware {
    constructor(
        private readonly settingService: SettingService,
        private readonly settingUseCase: SettingUseCase
    ) {}

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const maintenanceSetting: SettingEntity =
            await this.settingService.getMaintenance();
        const maintenance: boolean =
            await this.settingUseCase.getValue<boolean>(maintenanceSetting);

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
