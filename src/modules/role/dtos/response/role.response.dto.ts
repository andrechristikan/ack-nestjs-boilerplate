import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
import { DatabaseDto } from '@common/database/dtos/database.dto';
import { RolePermissionResponseDto } from '@modules/role/dtos/response/role.permission.response.dto';

export class RoleResponseDto extends DatabaseDto {
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
        description: 'Representative for role type',
        example: ENUM_POLICY_ROLE_TYPE.ADMIN,
        required: true,

        enum: ENUM_POLICY_ROLE_TYPE,
    })
    type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        type: RolePermissionResponseDto,
        oneOf: [{ $ref: getSchemaPath(RolePermissionResponseDto) }],
        required: true,

        isArray: true,
        default: [],
    })
    @Type(() => RolePermissionResponseDto)
    permissions: RolePermissionResponseDto[];
}
