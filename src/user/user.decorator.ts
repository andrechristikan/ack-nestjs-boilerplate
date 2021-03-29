import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
    (data: string, ctx: ExecutionContext): Record<string, any> => {
        const request = ctx.switchToHttp().getRequest();
        const user: Record<string, any> = request.user;
        return data ? user[data] : user;
    }
);
