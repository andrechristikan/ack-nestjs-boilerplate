import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGoogleOauth2LoginGuard } from 'src/common/auth/guards/google-oauth2/auth.google-oauth2-login.guard';

export function AuthGoogleOAuth2LoginProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthGoogleOauth2LoginGuard));
}
