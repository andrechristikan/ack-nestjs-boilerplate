import {
    UseGuards,
    createParamDecorator,
    ExecutionContext,
    applyDecorators,
    SetMetadata
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard/jwt/jwt.guard';
import { BasicGuard } from 'src/auth/guard/basic/basic.guard';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { PermissionGuard } from 'src/permission/guard/permission.guard';
import { JwtRefreshGuard } from './guard/jwt-refresh/jwt-refresh.guard';
import {
    ENUM_PERMISSIONS,
    PERMISSION_META_KEY
} from 'src/permission/permission.constant';

export function AuthJwtGuard(
    ...permissions: ENUM_PERMISSIONS[]
): IAuthApplyDecorator {
    return applyDecorators(
        UseGuards(JwtGuard, PermissionGuard),
        SetMetadata(PERMISSION_META_KEY, permissions)
    );
}

export function AuthBasicGuard(): IAuthApplyDecorator {
    return applyDecorators(UseGuards(BasicGuard));
}

export function AuthJwtRefreshGuard(): IAuthApplyDecorator {
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
