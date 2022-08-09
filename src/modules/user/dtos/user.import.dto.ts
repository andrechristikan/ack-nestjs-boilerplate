import { OmitType } from '@nestjs/mapped-types';
import { UserCreateDto } from './user.create.dto';

export class UserImportDto extends OmitType(UserCreateDto, [
    'role',
    'password',
] as const) {}
