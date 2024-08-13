import { ApiProperty } from '@nestjs/swagger';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/enums/setting.enum';

export class SettingGetResponseDto<T = any> extends DatabaseDto {
    @ApiProperty({
        description: 'Name of setting',
        example: 'MaintenanceOn',
        required: true,
        nullable: false,
    })
    name: string;

    @ApiProperty({
        description: 'Description of setting',
        example: 'Maintenance Mode',
        required: false,
        nullable: true,
    })
    description?: string;

    @ApiProperty({
        description: 'Data type of setting',
        example: 'BOOLEAN',
        required: true,
        nullable: false,
        enum: ENUM_SETTING_DATA_TYPE,
    })
    type: ENUM_SETTING_DATA_TYPE;

    @ApiProperty({
        description: 'Value of string, can be type string/boolean/number',
        oneOf: [
            { type: 'string', readOnly: true, examples: ['on', 'off'] },
            { type: 'number', readOnly: true, examples: [100, 200] },
            { type: 'boolean', readOnly: true, examples: [true, false] },
        ],
        required: true,
        nullable: false,
    })
    value: T;
}
