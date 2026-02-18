import { PickType } from '@nestjs/swagger';
import { RoleDto } from '@modules/role/dtos/role.dto';

export class TenantRoleResponseDto extends PickType(RoleDto, [
    'id',
    'name',
    'description',
] as const) {}
