import { PickType } from '@nestjs/swagger';
import { AuthApiGetSerialization } from './auth.api.get.serialization';

export class AuthApiListSerialization extends PickType(
    AuthApiGetSerialization,
    ['_id', 'name', 'key', 'isActive', 'createdAt'] as const
) {}
