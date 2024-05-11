import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { ENUM_POLICY_ROLE_TYPE } from 'src/common/policy/constants/policy.enum.constant';
import { RolePermissionDto } from 'src/modules/role/dtos/role.permission.dto';

export class RoleGetResponseDto extends DatabaseIdResponseDto {
    @ApiProperty({
        description: 'Name of role',
        example: faker.person.jobTitle(),
        required: true,
        nullable: false,
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
        nullable: false,
    })
    readonly isActive: boolean;

    @ApiProperty({
        description: 'Representative for role type',
        example: ENUM_POLICY_ROLE_TYPE.ADMIN,
        required: true,
        nullable: false,
    })
    readonly type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        type: RolePermissionDto,
        required: true,
        nullable: false,
        default: [],
    })
    @Type(() => RolePermissionDto)
    readonly permissions: RolePermissionDto;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    readonly createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    readonly updatedAt: Date;

    @ApiHideProperty()
    @Exclude()
    readonly deletedAt?: Date;
}
