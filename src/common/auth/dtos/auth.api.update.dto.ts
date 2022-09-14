import { PartialType } from '@nestjs/swagger';
import { AuthApiCreateDto } from './auth.api.create.dto';

export class AuthApiUpdateDto extends PartialType(AuthApiCreateDto) {}
