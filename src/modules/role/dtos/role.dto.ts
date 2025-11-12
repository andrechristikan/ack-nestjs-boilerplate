import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DatabaseDto } from '@common/database/dtos/database.dto';
import { ENUM_ROLE_TYPE } from '@prisma/client';
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
        example: ENUM_ROLE_TYPE.admin,
        required: true,
        enum: ENUM_ROLE_TYPE,
    })
    type: ENUM_ROLE_TYPE;

    @ApiProperty({
        type: RoleAbilityDto,
        oneOf: [{ $ref: getSchemaPath(RoleAbilityDto) }],
        required: true,
        isArray: true,
        default: [],
    })
    @Type(() => RoleAbilityDto)
    abilities: RoleAbilityDto[];
}
