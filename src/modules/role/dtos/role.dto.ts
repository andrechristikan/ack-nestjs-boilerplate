import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { EnumRoleType } from '@generated/prisma-client';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';

export class RoleDto extends DatabaseResponseDto {
    @ApiProperty({
        description: 'Name of role',
        example: faker.person.jobTitle(),
        required: true,
    })
    @Expose()
    name: string;

    @ApiProperty({
        description: 'Description of role',
        example: faker.lorem.sentence(),
        required: false,
        maxLength: 500,
    })
    @Expose()
    description?: string;

    @ApiProperty({
        description: 'Representative for role type',
        example: EnumRoleType.admin,
        required: true,
        enum: EnumRoleType,
    })
    @Expose()
    type: EnumRoleType;

    @ApiProperty({
        type: [RoleAbilityDto],
        required: true,
        isArray: true,
        default: [],
    })
    @Expose()
    @Type(() => RoleAbilityDto)
    abilities: RoleAbilityDto[];
}
