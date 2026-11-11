import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
    AuthSocialAppleDocSecurityName,
    AuthSocialAppleProtectedDocErrors,
    AuthSocialGithubProtectedDocErrors,
    AuthSocialGoogleDocSecurityName,
    AuthSocialGoogleProtectedDocErrors,
} from '@modules/auth/constants/auth.constant';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { AuthSocialAppleGuard } from '@modules/auth/guards/social/auth.social.apple.guard';
import { AuthSocialGithubGuard } from '@modules/auth/guards/social/auth.social.github.guard';
import { AuthSocialGoogleGuard } from '@modules/auth/guards/social/auth.social.google.guard';

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
export function AuthSocialGithubProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(AuthSocialGithubGuard),
        DocErrors(...AuthSocialGithubProtectedDocErrors)
    );
}
