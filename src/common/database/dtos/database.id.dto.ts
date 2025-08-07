import { DatabaseDto } from '@common/database/dtos/database.dto';
import { PickType } from '@nestjs/swagger';

/**
 * Database ID response DTO.
 * 
 * Simple response DTO containing only the ID field from the base DatabaseDto.
 * Commonly used for create/update operations where only the ID needs to be returned.
 */
export class DatabaseIdResponseDto extends PickType(DatabaseDto, [
    '_id',
] as const) {}
