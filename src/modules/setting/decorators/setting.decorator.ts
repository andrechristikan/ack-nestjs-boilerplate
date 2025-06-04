import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { SettingGuard } from '@modules/setting/guards/setting.guard.service';

export function FeatureFlag(
  key: string,
): MethodDecorator {
    let FEATURE_SETTING_META_KEY;
    return applyDecorators(
    UseGuards(SettingGuard),
    SetMetadata(FEATURE_SETTING_META_KEY, key),
  );
}