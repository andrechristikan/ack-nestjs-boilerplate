import { ApiProperty } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RolePermissionDto } from 'src/modules/role/dtos/role.permission.dto';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';

export class RoleUpdateRequestDto {
    @ApiProperty({
        description: 'Description of role',
        example: faker.lorem.sentence(),
        required: false,
        nullable: true,
    })
    @IsString()
    @IsOptional()
    @Type(() => String)
    description?: string;

    @ApiProperty({
        description: 'Representative for role type',
        example: 'ADMIN',
        required: true,
    })
    @IsEnum(ENUM_POLICY_ROLE_TYPE)
    @IsNotEmpty()
    type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        required: true,
        description: 'Permission list of role',
        isArray: true,
        default: [],
        example: [
            {
                subject: ENUM_POLICY_SUBJECT.API_KEY,
                action: [ENUM_POLICY_ACTION.MANAGE],
            },
        ],
        type: RolePermissionDto,
    })
    @Type(() => RolePermissionDto)
    @IsNotEmpty()
    @IsArray()
    @ValidateNested()
    @ValidateIf(e => e.type === ENUM_POLICY_ROLE_TYPE.ADMIN)
    @Transform(({ value, obj }) =>
        obj.type !== ENUM_POLICY_ROLE_TYPE.ADMIN ? [] : value
    )
    permissions: RolePermissionDto[];
}
