import {
    UseGuards,
    createParamDecorator,
    ExecutionContext,
    applyDecorators
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard/jwt/jwt.guard';
import { BasicGuard } from 'src/auth/guard/basic/basic.guard';
import { IApplyDecorator } from 'src/auth/auth.interface';
import { PermissionGuard } from 'src/permission/guard/permission.guard';
import { JwtRefreshGuard } from './guard/jwt-refresh/jwt-refresh.guard';

export function AuthJwtGuard(): IApplyDecorator {
    return applyDecorators(UseGuards(JwtGuard, PermissionGuard));
}

export function AuthBasicGuard(): IApplyDecorator {
    return applyDecorators(UseGuards(BasicGuard));
}

export function AuthJwtRefreshGuard(): IApplyDecorator {
    return applyDecorators(UseGuards(JwtRefreshGuard));
}

export const User = createParamDecorator(
    (data: string, ctx: ExecutionContext): Record<string, any> => {
        const { user } = ctx.switchToHttp().getRequest();
        return data ? user[data] : user;
    }
);

export const Token = createParamDecorator(
    (data: string, ctx: ExecutionContext): string => {
        const { headers } = ctx.switchToHttp().getRequest();
        const authorization: string[] = headers.authorization.split(' ');
        return authorization[1];
    }
);
