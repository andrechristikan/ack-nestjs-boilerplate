import { OmitType } from '@nestjs/swagger';
import { UserCreateDto } from './user.create.dto';

export class UserImportDto extends OmitType(UserCreateDto, [
    'role',
    'password',
] as const) {}
