import { applyDecorators, UseGuards } from '@nestjs/common';
import { SettingNotFoundGuard } from 'src/modules/setting/guards/setting.not-found.guard';
import { SettingPutToRequestGuard } from 'src/modules/setting/guards/setting.put-to-request.guard';

export function SettingAdminGetGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingPutToRequestGuard, SettingNotFoundGuard)
    );
}

export function SettingAdminUpdateGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingPutToRequestGuard, SettingNotFoundGuard)
    );
}
