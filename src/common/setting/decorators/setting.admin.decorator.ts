import { applyDecorators, UseGuards } from '@nestjs/common';
import { SettingNotFoundGuard } from 'src/common/setting/guards/setting.not-found.guard';
import { SettingPutToRequestGuard } from 'src/common/setting/guards/setting.put-to-request.guard';

export function SettingAdminUpdateGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingPutToRequestGuard, SettingNotFoundGuard)
    );
}
