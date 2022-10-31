import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SettingEntity } from 'src/common/setting/schemas/setting.schema';

export const GetSetting = createParamDecorator(
    (data: string, ctx: ExecutionContext): SettingEntity => {
        const { __setting } = ctx.switchToHttp().getRequest();
        return __setting;
    }
);
