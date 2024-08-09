import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { RolePermissionDto } from 'src/modules/role/dtos/role.permission.dto';

export class RoleGetResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Name of role',
        example: faker.person.jobTitle(),
        required: true,
        nullable: false,
    })
    name: string;

    @ApiProperty({
        description: 'Description of role',
        example: faker.lorem.sentence(),
        required: false,
        nullable: true,
    })
    description?: string;

    @ApiProperty({
        description: 'Active flag of role',
        example: true,
        required: true,
        nullable: false,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Representative for role type',
        example: ENUM_POLICY_ROLE_TYPE.ADMIN,
        required: true,
        nullable: false,
    })
    type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        type: RolePermissionDto,
        required: true,
        nullable: false,
        default: [],
    })
    @Type(() => RolePermissionDto)
    permissions: RolePermissionDto;
}
