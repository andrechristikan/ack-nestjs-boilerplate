import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';

export class RoleGetPermissionSerialization {
    @ApiProperty({
        required: true,
        description: 'Permission subject',
        enum: ENUM_POLICY_SUBJECT,
    })
    subject: ENUM_POLICY_SUBJECT;

    @ApiProperty({
        required: true,
        description: 'Permission action base on subject',
        isArray: true,
        enum: ENUM_POLICY_ACTION,
        default: [],
    })
    action: ENUM_POLICY_ACTION[];
}

export class RoleGetSerialization extends ResponseIdSerialization {
    @ApiProperty({
        description: 'Name of role',
        example: faker.name.jobTitle(),
        required: true,
    })
    readonly name: string;

    @ApiProperty({
        description: 'Description of role',
        example: faker.lorem.sentence(),
        required: false,
        nullable: true,
    })
    readonly description?: string;

    @ApiProperty({
        description: 'Active flag of role',
        example: true,
        required: true,
    })
    readonly isActive: boolean;

    @ApiProperty({
        description: 'Representative for role type',
        example: ENUM_ROLE_TYPE.ADMIN,
        required: true,
    })
    readonly type: ENUM_ROLE_TYPE;

    @ApiProperty({
        type: RoleGetPermissionSerialization,
        required: true,
        default: [],
    })
    readonly permissions: RoleGetPermissionSerialization;

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
