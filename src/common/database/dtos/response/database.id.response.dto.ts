import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { PickType } from '@nestjs/swagger';

/**
 * Response DTO exposing only the document `id`, for create/mutation results.
 */
export class DatabaseIdResponseDto extends PickType(DatabaseResponseDto, [
    'id',
] as const) {}
