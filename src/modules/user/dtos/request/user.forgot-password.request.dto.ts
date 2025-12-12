import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { PickType } from '@nestjs/swagger';

export class UserForgotPasswordRequestDto extends PickType(
    UserLoginRequestDto,
    ['email'] as const
) {}
