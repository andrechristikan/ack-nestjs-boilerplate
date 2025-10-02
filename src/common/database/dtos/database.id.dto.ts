import { DatabaseDto } from '@common/database/dtos/database.dto';
import { PickType } from '@nestjs/swagger';

export class DatabaseIdDto extends PickType(DatabaseDto, ['id'] as const) {}
