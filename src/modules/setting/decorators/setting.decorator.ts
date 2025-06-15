import { SETTING_FEATURE_META_KEY } from '@modules/setting/constants/setting.constant';
import { SettingFeatureGuard } from '@modules/setting/guards/setting-feature.guard';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

export function SettingFeatureFlag(key: string): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingFeatureGuard),
        SetMetadata(SETTING_FEATURE_META_KEY, key)
    );
}
