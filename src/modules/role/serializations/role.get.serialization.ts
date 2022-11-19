import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Transform, Type } from 'class-transformer';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

export class RoleGetSerialization {
    @ApiProperty({
        description: 'Id that representative with your target data',
        example: faker.database.mongodbObjectId(),
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
        example: [
            {
                _id: faker.database.mongodbObjectId(),
                code: faker.random.alpha(5),
                name: faker.name.jobDescriptor(),
                group: faker.name.jobDescriptor(),
                isActive: true,
            },
        ],
        required: true,
    })
    @Transform(({ obj }) =>
        obj.permissions.map((val: PermissionEntity) => ({
            _id: `${val._id}`,
            code: val.code,
            name: val.name,
            group: val.group,
            isActive: val.isActive,
        }))
    )
    readonly permissions: PermissionEntity[];

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
    })
    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
