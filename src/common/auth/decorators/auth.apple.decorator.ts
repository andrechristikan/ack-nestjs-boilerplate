import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthAppleOauth2Guard } from 'src/common/auth/guards/apple-oauth2/auth.apple-oauth2.guard';

export function AuthAppleOAuth2Protected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthAppleOauth2Guard));
}
