import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { PermissionGetSerialization } from 'src/modules/permission/serializations/permission.get.serialization';

export class RoleGetSerialization {
    @ApiProperty({
        description: 'Id that representative with your target data',
        example: faker.datatype.uuid(),
        required: true,
    })
    @Type(() => String)
    readonly _id: string;

    @ApiProperty({
        description: 'Active flag of role',
        example: true,
        required: true,
    })
    readonly isActive: boolean;

    @ApiProperty({
        description: 'Alias name of role',
        example: faker.name.jobTitle(),
        required: true,
    })
    readonly name: string;

    @ApiProperty({
        description: 'Representative for role',
        example: 'ADMIN',
        required: true,
    })
    readonly accessFor: ENUM_AUTH_ACCESS_FOR;

    @ApiProperty({
        description: 'List of permission',
        type: () => PermissionGetSerialization,
        isArray: true,
        required: true,
    })
    @Type(() => PermissionGetSerialization)
    readonly permissions: PermissionGetSerialization[];

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
    readonly deletedAt: Date;
}
