import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthSocialAppleGuard } from '@modules/auth/guards/social/auth.social.apple.guard';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';

/**
 * Decorator that applies Google social authentication protection to a route.
 * Validates Google authentication token from request headers.
 * @returns MethodDecorator - Decorator function that applies Google authentication guard
 */
export function AuthSocialGoogleProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthSocialGoogleGuard));
}

/**
 * Decorator that applies Apple social authentication protection to a route.
 * Validates Apple authentication token from request headers.
 * @returns MethodDecorator - Decorator function that applies Apple authentication guard
 */
export function AuthSocialAppleProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthSocialAppleGuard));
}
