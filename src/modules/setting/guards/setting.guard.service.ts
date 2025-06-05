import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SettingDbService } from '@modules/setting/services/setting.db.service';
import { SETTING_META_KEY } from '@modules/setting/constants/settings.constant';
import { ENUM_SETTING_STATUS_CODE_ERROR } from '@modules/setting/enums/setting.enum.status-code';

@Injectable()
export class SettingGuard implements CanActivate {
    constructor(
        private readonly settingService: SettingDbService,
        private readonly reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const featureKey = this.reflector.get<string>(
            SETTING_META_KEY,
            context.getHandler()
        );
        const isSettingEnabled = await this.settingService.isEnabled(
            featureKey,
            false,
            true
        );

        if (!isSettingEnabled) {
            throw new ForbiddenException({
                statusCode: ENUM_SETTING_STATUS_CODE_ERROR.INACTIVE,
                message: 'setting.error.featureInactive',
            });
        }

        return isSettingEnabled;
    }
}
