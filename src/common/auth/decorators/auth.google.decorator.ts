import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGoogleOauth2LoginGuard } from 'src/common/auth/guards/google-oauth2/auth.google-oauth2-login.guard';
import { AuthGoogleOauth2SignUpGuard } from 'src/common/auth/guards/google-oauth2/auth.google-oauth2-sign-up.guard';

export function AuthGoogleOAuth2SignUpProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthGoogleOauth2SignUpGuard));
}

export function AuthGoogleOAuth2LoginProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthGoogleOauth2LoginGuard));
}
