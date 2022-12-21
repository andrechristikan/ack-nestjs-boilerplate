import { RoleCreateDto } from './role.create.dto';
import { PartialType } from '@nestjs/swagger';

export class RoleUpdateNameDto extends PartialType(RoleCreateDto) {}
