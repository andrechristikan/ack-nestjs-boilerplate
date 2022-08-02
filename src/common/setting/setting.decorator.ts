import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards,
} from '@nestjs/common';
import { SettingNotFoundGuard } from './guards/setting.not-found.guard';
import {
    SettingPutToRequestByNameGuard,
    SettingPutToRequestGuard,
} from './guards/setting.put-to-request.guard';

export const GetSetting = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __setting } = ctx.switchToHttp().getRequest();
        return __setting;
    }
);

export function SettingGetGuard(): any {
    return applyDecorators(
        UseGuards(SettingPutToRequestGuard, SettingNotFoundGuard)
    );
}

export function SettingGetByNameGuard(): any {
    return applyDecorators(
        UseGuards(SettingPutToRequestByNameGuard, SettingNotFoundGuard)
    );
}

export function SettingUpdateGuard(): any {
    return applyDecorators(
        UseGuards(SettingPutToRequestGuard, SettingNotFoundGuard)
    );
}
