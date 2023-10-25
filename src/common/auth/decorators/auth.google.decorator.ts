import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGoogleOauth2Guard } from 'src/common/auth/guards/google-oauth2/auth.google-oauth2.guard';

export function AuthGoogleOAuth2Protected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthGoogleOauth2Guard));
}
