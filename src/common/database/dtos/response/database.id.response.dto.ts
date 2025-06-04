import { PickType } from '@nestjs/swagger';
import { DatabaseUUIDDto } from 'src/common/database/dtos/database.uuid.dto';

export class DatabaseIdResponseDto extends PickType(DatabaseUUIDDto, [
    '_id',
] as const) {}
