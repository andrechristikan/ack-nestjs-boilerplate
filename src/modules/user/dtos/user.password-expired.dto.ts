import { PickType } from '@nestjs/swagger';
import { UserPasswordDto } from 'src/modules/user/dtos/user.password.dto';

export class UserPasswordExpiredDto extends PickType(UserPasswordDto, [
    'passwordExpired',
] as const) {}
