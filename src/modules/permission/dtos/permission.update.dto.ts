import { PickType } from '@nestjs/mapped-types';
import { PermissionCreateDto } from './permission.create.dto';

export class PermissionUpdateDto extends PickType(PermissionCreateDto, [
    'name',
    'description',
] as const) {}
