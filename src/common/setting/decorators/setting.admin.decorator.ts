import { applyDecorators, UseGuards } from '@nestjs/common';
import { SettingNotFoundGuard } from '../guards/setting.not-found.guard';
import { SettingPutToRequestGuard } from '../guards/setting.put-to-request.guard';

export function SettingUpdateGuard(): any {
    return applyDecorators(
        UseGuards(SettingPutToRequestGuard, SettingNotFoundGuard)
    );
}
