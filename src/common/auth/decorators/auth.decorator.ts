import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
    (data: string, ctx: ExecutionContext): Record<string, any> => {
        const { user } = ctx.switchToHttp().getRequest();
        return data ? user[data] : user;
    }
);

export const Token = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const { headers } = ctx.switchToHttp().getRequest();
        const { authorization } = headers;
        return authorization ? authorization.split(' ')[1] : undefined;
    }
);
