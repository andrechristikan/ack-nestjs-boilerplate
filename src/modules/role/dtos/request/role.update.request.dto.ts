import { ApiProperty } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { EnumRoleType } from '@prisma/client';

export class RoleUpdateRequestDto {
    @ApiProperty({
        description: 'Description of role',
        example: faker.lorem.sentence(),
        required: false,
        maxLength: 500,
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    description?: string;

    @ApiProperty({
        description: 'Representative for role type',
        example: EnumRoleType.admin,
        required: true,
        enum: EnumRoleType,
    })
    @IsEnum(EnumRoleType)
    @IsNotEmpty()
    type: EnumRoleType;

    @ApiProperty({
        required: true,
        description: 'Ability list of role',
        isArray: true,
        type: [RoleAbilityRequestDto],
    })
    @Type(() => RoleAbilityRequestDto)
    @IsNotEmpty()
    @ValidateNested()
    @IsArray()
    abilities: RoleAbilityRequestDto[];
}
