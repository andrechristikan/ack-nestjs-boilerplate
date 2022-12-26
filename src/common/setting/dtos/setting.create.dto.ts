import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { SafeString } from 'src/common/request/validations/request.safe-string.validation';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';

export class SettingCreateDto {
    @IsString()
    @IsNotEmpty()
    @SafeString()
    @Type(() => String)
    readonly name: string;

    @IsString()
    @IsOptional()
    @Type(() => String)
    @ApiProperty({
        name: 'description',
        examples: ['Maintenance Mode', 'Max Part Number Aws Chunk File'],
        description: 'The description about setting',
        nullable: true,
    })
    readonly description?: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        description: 'Data type of setting',
        example: 'BOOLEAN',
        required: true,
        enum: ENUM_SETTING_DATA_TYPE,
    })
    readonly type: ENUM_SETTING_DATA_TYPE;

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
    readonly value: string;
}
