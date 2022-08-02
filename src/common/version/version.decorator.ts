import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetVersion = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __version } = ctx.switchToHttp().getRequest();
        return __version;
    }
);
