import { PartialType } from '@nestjs/swagger';
import { ApiKeyCreateDto } from './api-key.create.dto';

export class ApiKeyUpdateDto extends PartialType(ApiKeyCreateDto) {}
