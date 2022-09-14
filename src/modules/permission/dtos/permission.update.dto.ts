import { PickType } from '@nestjs/swagger';
import { PermissionCreateDto } from './permission.create.dto';

export class PermissionUpdateDto extends PickType(PermissionCreateDto, [
    'name',
    'description',
] as const) {}
