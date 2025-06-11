import { SETTING_FEATURE_META_KEY } from '@modules/setting/constants/settings.constant';
import { SettingFeatureGuard } from '@modules/setting/guards/setting-feature.advanced.guard';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

export function SettingEnabled(key: string): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingFeatureGuard),
        SetMetadata(SETTING_FEATURE_META_KEY, key)
    );
}
