import { DatabaseDto } from '@common/database/dtos/database.dto';
import { PickType } from '@nestjs/swagger';

export class DatabaseIdResponseDto extends PickType(DatabaseDto, [
    'id',
] as const) {}
