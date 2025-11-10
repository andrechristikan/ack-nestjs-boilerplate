import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { PickType } from '@nestjs/swagger';

export class ResetPasswordForgotRequestDto extends PickType(
    UserLoginRequestDto,
    ['email'] as const
) {}
