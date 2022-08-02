import { RoleCreateDto } from './role.create.dto';
import { OmitType } from '@nestjs/mapped-types';

export class RoleUpdateDto extends OmitType(RoleCreateDto, [
    'isActive',
] as const) {}
