import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';
import { SafeString } from 'src/common/request/validations/request.safe-string.validation';
import { StringOrNumberOrBoolean } from 'src/common/request/validations/request.string-or-number-or-boolean.validation';

export class SettingCreateDto {
    @IsString()
    @IsNotEmpty()
    @SafeString()
    @Type(() => String)
    readonly name: string;

    @IsString()
    @IsOptional()
    @Type(() => String)
    @ValidateIf((e) => e.description !== '')
    @ApiProperty({
        name: 'description',
        examples: ['Maintenance Mode', 'Max Part Number Aws Chunk File'],
        description: 'The description about setting',
        nullable: true,
    })
    readonly description?: string;

    @IsNotEmpty()
    @StringOrNumberOrBoolean()
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
