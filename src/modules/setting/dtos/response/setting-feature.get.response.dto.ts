import { ApiProperty } from '@nestjs/swagger';
import { DatabaseUUIDDto } from '@common/database/dtos/database.uuid.dto';
import { SettingValue } from '@modules/setting/interfaces/setting.interface';

export class SettingFeatureGetResponseDto extends DatabaseUUIDDto {
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
        example: { "enabled": true, "config1": "value1", "prop": "config"},
        required: true,
        oneOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'object' },
            { type: 'array' },
        ],
    })
    value: SettingValue;
}
