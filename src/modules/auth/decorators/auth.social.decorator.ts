import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
    AuthSocialAppleDocSecurityName,
    AuthSocialGoogleDocSecurityName,
    DocAuthSocialAppleErrorResponses,
    DocAuthSocialGoogleErrorResponses,
} from '@modules/auth/constants/auth.constant';
import { AuthSocialAppleGuard } from '@modules/auth/guards/social/auth.social.apple.guard';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';

/**
 * Protects a route with Google social authentication and documents the Google Bearer kit.
 * @public
 */
export function AuthSocialGoogleProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthSocialGoogleGuard),
        ApiBearerAuth(AuthSocialGoogleDocSecurityName),
        DocAuthSocialGoogleErrorResponses.unauthorized
    );
}

/**
 * Protects a route with Apple social authentication and documents the Apple Bearer kit.
 * @public
 */
export function AuthSocialAppleProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthSocialAppleGuard),
        ApiBearerAuth(AuthSocialAppleDocSecurityName),
        DocAuthSocialAppleErrorResponses.unauthorized
    );
}
