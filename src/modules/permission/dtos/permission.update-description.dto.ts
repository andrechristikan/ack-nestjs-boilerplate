import { PickType } from '@nestjs/swagger';
import { PermissionCreateDto } from './permission.create.dto';

export class PermissionUpdateDescriptionDto extends PickType(
    PermissionCreateDto,
    ['description'] as const
) {}
