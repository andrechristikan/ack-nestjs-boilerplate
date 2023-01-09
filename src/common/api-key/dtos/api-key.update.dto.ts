import { PickType } from '@nestjs/swagger';
import { ApiKeyCreateDto } from './api-key.create.dto';

export class ApiKeyUpdateDto extends PickType(ApiKeyCreateDto, [
    'name',
    'description',
] as const) {}
