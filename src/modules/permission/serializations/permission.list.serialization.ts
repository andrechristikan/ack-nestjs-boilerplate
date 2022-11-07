import { PartialType } from '@nestjs/swagger';
import { PermissionGetSerialization } from './permission.get.serialization';

export class PermissionListSerialization extends PartialType(
    PermissionGetSerialization
) {}
