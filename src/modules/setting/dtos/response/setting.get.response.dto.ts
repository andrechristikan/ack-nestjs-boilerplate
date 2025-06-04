import { DatabaseDto } from '@common/database/dtos/database.dto';
import { ApiProperty } from '@nestjs/swagger';

export class SettingGetResponseDto<T = any> extends DatabaseDto {
    @ApiProperty({
        description: 'Unique key identifying the feature configuration',
        example: 'feature_key',
        required: true,
    })
    key: string;

    @ApiProperty({
        description: 'Description of the feature configuration',
        example: 'This feature enables X functionality.',
        required: true,
    })
    description: string;

    @ApiProperty({
        description: 'Value of the feature configuration',
        example: 'true',
        required: true,
    })
    value: T;
}
