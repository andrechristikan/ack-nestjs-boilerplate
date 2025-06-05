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
import { SettingAdvancedValue } from '@modules/setting/repository/entities/setting.entity';

@Injectable()
export class SettingAdvancedGuard implements CanActivate {
    constructor(
        private readonly settingService: SettingDbService<SettingAdvancedValue>,
        private readonly reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const featureKey = this.reflector.get<string>(
            SETTING_META_KEY,
            context.getHandler()
        );
        const advancedSetting = await this.settingService.get<SettingAdvancedValue>(featureKey,{ enabled: false},true)

        if (!advancedSetting.enabled) {
            throw new ForbiddenException({
                statusCode: ENUM_SETTING_STATUS_CODE_ERROR.INACTIVE,
                message: 'setting.error.featureInactive',
            });
        }

        return advancedSetting.enabled;
    }
}
