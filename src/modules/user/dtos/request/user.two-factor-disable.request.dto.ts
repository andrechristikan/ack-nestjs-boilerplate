import { UserTwoFactorVerifyRequestDto } from '@modules/user/dtos/request/user.two-factor-verify.request.dto';
import { OmitType } from '@nestjs/swagger';

export class UserTwoFactorDisableRequestDto extends OmitType(
    UserTwoFactorVerifyRequestDto,
    ['challengeToken'] as const
) {}
