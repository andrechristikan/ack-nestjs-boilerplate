import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
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
import { RolePermissionDto } from 'src/modules/role/dtos/role.permission.dto';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

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
        example: ENUM_POLICY_ROLE_TYPE.ADMIN,
        required: true,
        enum: ENUM_POLICY_ROLE_TYPE,
    })
    @IsEnum(ENUM_POLICY_ROLE_TYPE)
    @IsNotEmpty()
    type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        required: true,
        description: 'Permission list of role',
        isArray: true,
        type: RolePermissionDto,
        oneOf: [{ $ref: getSchemaPath(RolePermissionDto) }],
    })
    @Type(() => RolePermissionDto)
    @IsNotEmpty()
    @ValidateNested()
    @IsArray()
    permissions: RolePermissionDto[];
}
