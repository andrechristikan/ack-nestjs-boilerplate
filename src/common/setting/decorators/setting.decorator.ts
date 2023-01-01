import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards,
} from '@nestjs/common';
import { SettingNotFoundGuard } from 'src/common/setting/guards/setting.not-found.guard';
import {
    SettingPutToRequestByNameGuard,
    SettingPutToRequestGuard,
} from 'src/common/setting/guards/setting.put-to-request.guard';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';

export const GetSetting = createParamDecorator(
    (data: string, ctx: ExecutionContext): SettingEntity => {
        const { __setting } = ctx.switchToHttp().getRequest();
        return __setting;
    }
);

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
