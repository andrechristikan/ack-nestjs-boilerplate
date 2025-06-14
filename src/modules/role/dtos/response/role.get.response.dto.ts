import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DatabaseUUIDDto } from '@common/database/dtos/database.uuid.dto';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
import { RolePermissionDto } from '@modules/role/dtos/role.permission.dto';

export class RoleGetResponseDto extends DatabaseUUIDDto {
    @ApiProperty({
        description: 'Name of role',
        example: faker.person.jobTitle(),
        required: true,
    })
    name: string;

    @ApiProperty({
        description: 'Description of role',
        example: faker.lorem.sentence(),
        required: false,
        maxLength: 500,
    })
    description?: string;

    @ApiProperty({
        description: 'Active flag of role',
        example: true,
        required: true,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Representative for role type',
        example: ENUM_POLICY_ROLE_TYPE.ADMIN,
        required: true,

        enum: ENUM_POLICY_ROLE_TYPE,
    })
    type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        type: RolePermissionDto,
        oneOf: [{ $ref: getSchemaPath(RolePermissionDto) }],
        required: true,

        isArray: true,
        default: [],
    })
    @Type(() => RolePermissionDto)
    permissions: RolePermissionDto[];
}
