import { PickType } from '@nestjs/swagger';
import { AuthChangePasswordRequestDto } from '@modules/auth/dtos/request/auth.change-password.request.dto';

export class ResetPasswordResetRequestDto extends PickType(
    AuthChangePasswordRequestDto,
    ['newPassword'] as const
) {}
