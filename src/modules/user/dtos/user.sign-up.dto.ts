import { OmitType } from '@nestjs/mapped-types';
import { UserCreateDto } from './user.create.dto';

export class UserSignUpDto extends OmitType(UserCreateDto, ['role'] as const) {}
