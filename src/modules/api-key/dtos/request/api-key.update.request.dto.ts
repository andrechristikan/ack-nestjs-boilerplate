import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { PickType } from '@nestjs/swagger';

export class ApiKeyUpdateRequestDto extends PickType(ApiKeyCreateRequestDto, [
    'name',
] as const) {}
