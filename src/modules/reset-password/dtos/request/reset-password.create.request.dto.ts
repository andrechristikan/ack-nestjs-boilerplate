import { PickType } from '@nestjs/swagger';
import { AuthLoginRequestDto } from '@modules/auth/dtos/request/auth.login.request.dto';

export class ResetPasswordCreateRequestDto extends PickType(
    AuthLoginRequestDto,
    ['email'] as const
) {}
