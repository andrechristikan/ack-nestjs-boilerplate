import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { SettingGuard } from '@modules/setting/guards/setting.guard.service';
import { SETTING_META_KEY } from '@modules/setting/constants/settings.constant';
import { SettingAdvancedGuard } from '@modules/setting/guards/setting-advanced.guard.service';

export function SettingEnabled(key: string): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingGuard),
        SetMetadata(SETTING_META_KEY, key)
    );
}

export function SettingAdvancedEnabled(key: string): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingAdvancedGuard),
        SetMetadata(SETTING_META_KEY, key)
    );
}
