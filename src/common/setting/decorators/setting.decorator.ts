import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SettingDocument } from '../schemas/setting.schema';
export const GetSetting = createParamDecorator(
    (data: string, ctx: ExecutionContext): SettingDocument => {
        const { __setting } = ctx.switchToHttp().getRequest();
        return __setting;
    }
);
