import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { SafeString } from 'src/common/request/validations/request.safe-string.validation';
import { ENUM_SETTING_DATA_TYPE } from 'src/modules/setting/enums/setting.enum';

export class SettingCreateRequestDto {
    @IsString()
    @IsNotEmpty()
    @SafeString()
    @Type(() => String)
    name: string;

    @IsString()
    @IsOptional()
    @Type(() => String)
    @ApiProperty({
        name: 'description',
        examples: ['Maintenance Mode', 'Max Part Number Aws Chunk File'],
        description: 'The description about setting',
        nullable: true,
    })
    description?: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        description: 'Data type of setting',
        example: 'BOOLEAN',
        required: true,
        enum: ENUM_SETTING_DATA_TYPE,
    })
    type: ENUM_SETTING_DATA_TYPE;

    @IsNotEmpty()
    @Type(() => String)
    @ApiProperty({
        name: 'value',
        description: 'The value of setting',
        nullable: false,
        oneOf: [
            { type: 'string', readOnly: true, examples: ['on', 'off'] },
            { type: 'number', readOnly: true, examples: [100, 200] },
            { type: 'boolean', readOnly: true, examples: [true, false] },
        ],
    })
    value: string;
}
