import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Transform, Type } from 'class-transformer';

export class SettingGetSerialization {
    @ApiProperty({
        description: 'Id that representative with your target data',
        example: faker.database.mongodbObjectId(),
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
    @Transform(({ value }) => {
        let convertValue: string | boolean | number = value;

        const regexNumber = /^-?\d+$/;
        if (value === 'true' || value === 'false') {
            convertValue = value === 'true';
        } else if (regexNumber.test(value)) {
            convertValue = Number(value);
        }

        return convertValue;
    })
    readonly value: string | number | boolean;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: false,
    })
    readonly createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: false,
    })
    readonly updatedAt: Date;

    @Exclude()
    readonly deletedAt: Date;
}
