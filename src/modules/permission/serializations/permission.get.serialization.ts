import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';

export class PermissionGetSerialization {
    @ApiProperty({
        description: 'Id that representative with your target data',
        example: faker.datatype.uuid(),
        required: true,
    })
    @Type(() => String)
    readonly _id: string;

    @ApiProperty({
        description: 'Active flag of permission',
        example: true,
        required: true,
    })
    readonly isActive: boolean;

    @ApiProperty({
        description: 'Unique code of permission',
        example: faker.random.alpha(5),
        required: true,
    })
    readonly code: string;

    @ApiProperty({
        enum: ENUM_PERMISSION_GROUP,
        type: 'string',
    })
    readonly group: ENUM_PERMISSION_GROUP;

    @ApiProperty({
        description: 'Description of permission',
        example: 'blabla description',
        required: false,
    })
    readonly description?: string;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
    })
    readonly createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: false,
    })
    readonly updatedAt: Date;

    @Exclude()
    readonly deletedAt?: Date;
}
