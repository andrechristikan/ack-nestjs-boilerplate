import { applyDecorators, UseGuards } from '@nestjs/common';
import { SettingNotFoundGuard } from 'src/common/setting/guards/setting.not-found.guard';
import {
    SettingPutToRequestByNameGuard,
    SettingPutToRequestGuard,
} from 'src/common/setting/guards/setting.put-to-request.guard';

export function SettingGetGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingPutToRequestGuard, SettingNotFoundGuard)
    );
}

export function SettingGetByNameGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(SettingPutToRequestByNameGuard, SettingNotFoundGuard)
    );
}
