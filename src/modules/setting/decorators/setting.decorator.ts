import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { SettingGuard } from '@modules/setting/guards/setting.guard.service';
import { SETTING_META_KEY } from '@modules/setting/constants/settings.constant';

export function SettingEnabled(key: string): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingGuard),
        SetMetadata(SETTING_META_KEY, key)
    );
}
