import { applyDecorators, UseGuards } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthJwtAccessGuard } from 'src/common/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from 'src/common/auth/guards/jwt/auth.jwt.refresh.guard';
import { ENUM_POLICY_ROLE } from 'src/common/policy/constants/policy.enum.constant';
import { PolicyRoleProtected } from 'src/common/policy/decorators/policy.decorator';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export const AuthJwtPayload = createParamDecorator(
    <T>(data: string, ctx: ExecutionContext): T => {
        const { user } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { user: T }>();
        return data ? user[data] : user;
    }
);

export const AuthJwtToken = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string => {
        const { headers } = ctx.switchToHttp().getRequest<IRequestApp>();
        const { authorization } = headers;
        const authorizations: string[] = authorization.split(' ');

        return authorizations.length >= 2 ? authorizations[1] : undefined;
    }
);

export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtAccessGuard));
}

export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtRefreshGuard));
}

export function AuthJwtAccessAdminProtected() {
    return applyDecorators(
        AuthJwtAccessProtected(),
        PolicyRoleProtected(ENUM_POLICY_ROLE.ADMIN)
    );
}

export function AuthJwtAccessUserProtected() {
    return applyDecorators(
        AuthJwtAccessProtected(),
        PolicyRoleProtected(ENUM_POLICY_ROLE.USER)
    );
}
