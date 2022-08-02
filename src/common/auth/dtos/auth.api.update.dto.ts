import { PartialType } from '@nestjs/mapped-types';
import { AuthApiCreateDto } from './auth.api.create.dto';

export class AuthApiUpdateDto extends PartialType(AuthApiCreateDto) {}
