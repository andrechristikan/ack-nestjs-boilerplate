import { PickType } from '@nestjs/mapped-types';
import { UserCreateDto } from './user.create.dto';

export class UserUpdateDto extends PickType(UserCreateDto, [
    'firstName',
    'lastName',
] as const) {}
