import { PartialType } from '@nestjs/mapped-types';
import { PermissionGetSerialization } from './permission.get.serialization';

export class PermissionListSerialization extends PartialType(
    PermissionGetSerialization
) {}
