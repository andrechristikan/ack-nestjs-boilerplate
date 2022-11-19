import { PickType } from '@nestjs/swagger';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';

export class PermissionUpdateGroupDto extends PickType(PermissionCreateDto, [
    'group',
] as const) {}
