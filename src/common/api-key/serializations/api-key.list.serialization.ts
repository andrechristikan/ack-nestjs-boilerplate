import { OmitType } from '@nestjs/swagger';
import { ApiKeyGetSerialization } from 'src/common/api-key/serializations/api-key.get.serialization';

export class ApiKeyListSerialization extends OmitType(ApiKeyGetSerialization, [
    'description',
] as const) {}
