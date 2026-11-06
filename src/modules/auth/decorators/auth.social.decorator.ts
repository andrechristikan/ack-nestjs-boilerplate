import { UseGuards, applyDecorators } from '@nestjs/common';
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

/**
 * Protects a route with Google social authentication and documents the Google Bearer scheme and its guard errors.
 * @public
 */
export function AuthSocialGoogleProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthSocialGoogleGuard),
        ApiBearerAuth(AuthSocialGoogleDocSecurityName),
        DocErrors(...AuthSocialGoogleProtectedDocErrors)
    );
}

/**
 * Protects a route with Apple social authentication and documents the Apple Bearer scheme and its guard errors.
 * @public
 */
export function AuthSocialAppleProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthSocialAppleGuard),
        ApiBearerAuth(AuthSocialAppleDocSecurityName),
        DocErrors(...AuthSocialAppleProtectedDocErrors)
    );
}
