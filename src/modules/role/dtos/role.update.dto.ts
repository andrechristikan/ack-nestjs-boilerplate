import { RoleCreateDto } from './role.create.dto';
import { PartialType } from '@nestjs/mapped-types';

export class RoleUpdateDto extends PartialType(RoleCreateDto) {}
