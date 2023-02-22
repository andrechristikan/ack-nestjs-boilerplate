import { PickType } from '@nestjs/swagger';
import { RoleCreateDto } from './role.create.dto';

export class RoleUpdateNameDto extends PickType(RoleCreateDto, [
    'name',
] as const) {}
