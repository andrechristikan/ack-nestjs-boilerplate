import { PickType } from '@nestjs/swagger';
import { AuthPasswordDto } from 'src/common/auth/dtos/auth.password.dto';

export class AuthPasswordExpiredDto extends PickType(AuthPasswordDto, [
    'passwordExpired',
] as const) {}
