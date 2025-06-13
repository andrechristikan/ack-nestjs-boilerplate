import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ENUM_SETTING_FEATURE_STATUS_CODE_ERROR } from '@modules/setting/enums/setting.enum.status-code';
import { SETTING_FEATURE_META_KEY } from '@modules/setting/constants/setting.constant';
import { SettingFeatureService } from '@modules/setting/services/setting-feature.service';

@Injectable()
export class SettingFeatureGuard implements CanActivate {
    constructor(
        private readonly settingFeatureService: SettingFeatureService,
        private readonly reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const featureKey = this.reflector.get<string>(
            SETTING_FEATURE_META_KEY,
            context.getHandler()
        );

        const advancedSetting = await this.settingFeatureService.get<{
            enabled: boolean;
        }>(featureKey, { enabled: false });

        if (!advancedSetting.enabled) {
            throw new ForbiddenException({
                statusCode: ENUM_SETTING_FEATURE_STATUS_CODE_ERROR.INACTIVE,
                message: 'settingFeature.error.inactive',
            });
        }

        return advancedSetting.enabled;
    }
}
