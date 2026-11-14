import {
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IAuthSocialContext } from '@modules/auth/interfaces/auth.interface';
import {
    AuthSocialAppleDocSecurityName,
    AuthSocialAppleProtectedDocErrors,
    AuthSocialContextStoreKey,
    AuthSocialGoogleDocSecurityName,
    AuthSocialGoogleProtectedDocErrors,
} from '@modules/auth/constants/auth.constant';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { AuthSocialAppleGuard } from '@modules/auth/guards/social/auth.social.apple.guard';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';

/** @public */
export const AuthSocialContext = createParamDecorator(
    (): IAuthSocialContext => {
        const authContext =
            ClsServiceManager.getClsService().get<IAuthSocialContext | null>(
                AuthSocialContextStoreKey
            ) ?? null;
        if (authContext === null) {
            throw new RequestContextMissingException(AuthSocialContextStoreKey);
        }

        return authContext;
    }
);

/** @public */
export function AuthSocialGoogleProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthSocialGoogleGuard),
        ApiBearerAuth(AuthSocialGoogleDocSecurityName),
        DocErrors(...AuthSocialGoogleProtectedDocErrors)
    );
}

/** @public */
export function AuthSocialAppleProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthSocialAppleGuard),
        ApiBearerAuth(AuthSocialAppleDocSecurityName),
        DocErrors(...AuthSocialAppleProtectedDocErrors)
    );
}
