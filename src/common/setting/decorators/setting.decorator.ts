import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Setting } from 'src/common/setting/schemas/setting.schema';

export const GetSetting = createParamDecorator(
    (data: string, ctx: ExecutionContext): Setting => {
        const { __setting } = ctx.switchToHttp().getRequest();
        return __setting;
    }
);
