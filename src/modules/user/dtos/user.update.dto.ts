import { PickType } from '@nestjs/swagger';
import { UserCreateDto } from './user.create.dto';

export class UserUpdateDto extends PickType(UserCreateDto, [
    'firstName',
    'lastName',
] as const) {}
