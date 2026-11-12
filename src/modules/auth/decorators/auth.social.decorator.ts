import {
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
    AuthSocialAppleDocSecurityName,
    AuthSocialAppleProtectedDocErrors,
    AuthSocialGoogleDocSecurityName,
    AuthSocialGoogleProtectedDocErrors,
} from '@modules/auth/constants/auth.constant';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { AuthSocialAppleGuard } from '@modules/auth/guards/social/auth.social.apple.guard';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtGuardMissingException } from '@modules/auth/exceptions/auth.jwt-guard-missing.exception';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';

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

/** @public */
export const AuthSocialEmail = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): string => {
        const user =
            ctx.switchToHttp().getRequest<IRequestApp<IAuthSocialPayload>>()
                .user ?? null;
        if (user === null) {
            throw new AuthJwtGuardMissingException();
        }

        const email = user.email ?? null;
        if (email === null) {
            throw new RequestContextMissingException('request.user.email');
        }

        return email;
    }
);
