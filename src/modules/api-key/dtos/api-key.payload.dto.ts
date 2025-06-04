import { PickType } from '@nestjs/swagger';
import { ApiKeyGetResponseDto } from '@module/api-key/dtos/response/api-key.get.response.dto';

export class ApiKeyPayloadDto extends PickType(ApiKeyGetResponseDto, [
    '_id',
    'name',
    'type',
    'key',
] as const) {}
