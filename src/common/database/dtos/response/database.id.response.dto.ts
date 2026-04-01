import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { PickType } from '@nestjs/swagger';

/**
 * Minimal response DTO that exposes only the document `id`.
 *
 * Used for create or mutation responses where only the newly assigned identifier
 * needs to be returned to the caller.
 */
export class DatabaseIdResponseDto extends PickType(DatabaseResponseDto, [
    'id',
] as const) {}
