import { UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard/jwt/jwt.guard';
import { BasicGuard } from 'src/auth/guard/basic/basic.guard';
import { applyDecorators } from '@nestjs/common';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export function AuthJwt(): IApplyDecorator {
    return applyDecorators(UseGuards(JwtGuard));
}

export function AuthBasic(): IApplyDecorator {
    return applyDecorators(UseGuards(BasicGuard));
}

export const User = createParamDecorator(
    (data: string, ctx: ExecutionContext): Record<string, any> => {
        const { user} = ctx.switchToHttp().getRequest();
        return data ? user[data] : user;
    }
);
