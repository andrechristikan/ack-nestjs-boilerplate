import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SettingGetSerialization {
    @ApiProperty({
        description: 'Id that representative with your target data',
        example: '631d9f32a65cf07250b8938c',
        required: true,
    })
    @Type(() => String)
    readonly _id: string;

    @ApiProperty({
        description: 'Name of setting',
        example: 'MaintenanceOn',
        required: true,
    })
    readonly name: string;

    @ApiProperty({
        description: 'Description of setting',
        example: 'Maintenance Mode',
        required: false,
    })
    readonly description?: string;

    @ApiProperty({
        description: 'Value of string, can be type string/boolean/number',
        oneOf: [
            { type: 'string', readOnly: true, examples: ['on', 'off'] },
            { type: 'number', readOnly: true, examples: [100, 200] },
            { type: 'boolean', readOnly: true, examples: [true, false] },
        ],
        required: true,
    })
    readonly value: string | number | boolean;

    @ApiProperty({
        description: 'Date created at',
        example: new Date(),
        required: false,
    })
    readonly createdAt: Date;

    @ApiProperty({
        description: 'Last date updated at',
        example: new Date(),
        required: false,
    })
    readonly updatedAt: Date;
}
