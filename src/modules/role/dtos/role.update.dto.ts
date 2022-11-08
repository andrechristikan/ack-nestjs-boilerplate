import { RoleCreateDto } from './role.create.dto';
import { PartialType } from '@nestjs/swagger';

export class RoleUpdateDto extends PartialType(RoleCreateDto) {}
