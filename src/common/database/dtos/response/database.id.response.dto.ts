import { PickType } from '@nestjs/swagger';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';

export class DatabaseIdResponseDto extends PickType(DatabaseDto, [
    '_id',
] as const) {}
