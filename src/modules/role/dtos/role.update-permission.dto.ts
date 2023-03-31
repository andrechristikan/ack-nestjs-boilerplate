import { RoleCreateDto } from './role.create.dto';
import { PickType } from '@nestjs/swagger';

export class RoleUpdatePermissionDto extends PickType(RoleCreateDto, [
    'accessFor',
    'permissions',
] as const) {}
