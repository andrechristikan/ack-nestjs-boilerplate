import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { PickType } from '@nestjs/swagger';

export class TenantInviteSignupRequestDto extends PickType(UserSignUpRequestDto, [
    'password',
] as const) {}
