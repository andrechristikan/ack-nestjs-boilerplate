import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DatabaseDto } from '@common/database/dtos/database.dto';
import { EnumRoleScope, EnumRoleType } from '@prisma/client';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';

export class RoleDto extends DatabaseDto {
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
        example: EnumRoleType.admin,
        required: true,
        enum: EnumRoleType,
    })
    type: EnumRoleType;

    @ApiProperty({
        description: 'Scope of role (platform or tenant)',
        example: EnumRoleScope.platform,
        required: true,
        enum: EnumRoleScope,
    })
    scope: EnumRoleScope;

    @ApiProperty({
        type: [RoleAbilityDto],
        required: true,
        isArray: true,
        default: [],
    })
    @Type(() => RoleAbilityDto)
    abilities: RoleAbilityDto[];
}
