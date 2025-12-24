import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { OmitType } from '@nestjs/swagger';

export class UserTwoFactorDisableRequestDto extends OmitType(
    UserLoginVerifyTwoFactorRequestDto,
    ['challengeToken'] as const
) {}
