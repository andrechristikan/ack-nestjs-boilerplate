import {
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type {
    IAuthJwtAccessContext,
    IAuthJwtRefreshContext,
} from '@modules/auth/interfaces/auth.interface';
import {
    AuthJwtAccessContextStoreKey,
    AuthJwtAccessDocSecurityName,
    AuthJwtAccessProtectedDocErrors,
    AuthJwtRefreshContextStoreKey,
    AuthJwtRefreshDocSecurityName,
    AuthJwtRefreshProtectedDocErrors,
} from '@modules/auth/constants/auth.constant';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { AuthJwtAccessGuard } from '@modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from '@modules/auth/guards/jwt/auth.jwt.refresh.guard';

/** @public */
export const AuthJwtAccessContext = createParamDecorator(
    (): IAuthJwtAccessContext => {
        const authContext =
            ClsServiceManager.getClsService().get<IAuthJwtAccessContext | null>(
                AuthJwtAccessContextStoreKey
            ) ?? null;
        if (authContext === null) {
            throw new RequestContextMissingException(
                AuthJwtAccessContextStoreKey
            );
        }

        return authContext;
    }
);

/** @public */
export const AuthJwtRefreshContext = createParamDecorator(
    (): IAuthJwtRefreshContext => {
        const authContext =
            ClsServiceManager.getClsService().get<IAuthJwtRefreshContext | null>(
                AuthJwtRefreshContextStoreKey
            ) ?? null;
        if (authContext === null) {
            throw new RequestContextMissingException(
                AuthJwtRefreshContextStoreKey
            );
        }

        return authContext;
    }
);

/** @public */
export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtAccessGuard),
        ApiBearerAuth(AuthJwtAccessDocSecurityName),
        DocErrors(...AuthJwtAccessProtectedDocErrors)
    );
}

/** @public */
export function AuthJwtRefreshProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthJwtRefreshGuard),
        ApiBearerAuth(AuthJwtRefreshDocSecurityName),
        DocErrors(...AuthJwtRefreshProtectedDocErrors)
    );
}
