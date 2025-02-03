import { PickType } from '@nestjs/swagger';
import { AuthSocialGooglePayloadDto } from 'src/modules/auth/dtos/social/auth.social.google-payload.dto';

export class AuthSocialApplePayloadDto extends PickType(
    AuthSocialGooglePayloadDto,
    ['email', 'emailVerified'] as const
) {}
