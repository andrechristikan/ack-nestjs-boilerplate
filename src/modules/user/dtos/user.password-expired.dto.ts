import { PickType } from '@nestjs/mapped-types';
import { UserPasswordDto } from 'src/modules/user/dtos/user.password.dto';

export class UserPasswordExpiredDto extends PickType(UserPasswordDto, [
    'passwordExpired',
] as const) {}
