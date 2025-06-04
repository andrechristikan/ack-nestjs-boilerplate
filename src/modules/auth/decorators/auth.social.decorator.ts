import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthSocialAppleGuard } from '@module/auth/guards/social/auth.social.apple.guard';
import { AuthSocialGoogleGuard } from '@module/auth/guards/social/auth.social.google.guard';

export function AuthSocialGoogleProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthSocialGoogleGuard));
}

export function AuthSocialAppleProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthSocialAppleGuard));
}
