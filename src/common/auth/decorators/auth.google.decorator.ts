import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGoogleOauth2Guard } from 'src/common/auth/guards/google-oauth2/auth.google-oauth2.guard';
import { AuthGoogleOauth2SignUpGuard } from '../guards/google-oauth2/auth.google-oauth2-sign-up.guard';
import { AuthGoogleOauth2LoginGuard } from '../guards/google-oauth2/auth.google-oauth2-login.guard';

export function AuthGoogleOAuth2Protected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthGoogleOauth2Guard));
}

export function AuthGoogleOAuth2SignUpProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthGoogleOauth2SignUpGuard));
}

export function AuthGoogleOAuth2LoginProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthGoogleOauth2LoginGuard));
}