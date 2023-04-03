import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsString,
} from 'class-validator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';

class RolePermissionsDto {
    @ApiProperty({
        required: true,
        description: 'Permission subject',
        enum: ENUM_POLICY_SUBJECT,
    })
    @IsNotEmpty()
    @IsString()
    @IsEnum(ENUM_POLICY_SUBJECT)
    subject: ENUM_POLICY_SUBJECT;

    @ApiProperty({
        required: true,
        description: 'Permission action base on subject',
        isArray: true,
        default: [],
        enum: ENUM_POLICY_ACTION,
    })
    @IsString({ each: true })
    @IsEnum(ENUM_POLICY_ACTION, { each: true })
    @IsArray()
    @IsNotEmpty()
    @ArrayNotEmpty()
    action: ENUM_POLICY_ACTION[];
}

export class RoleUpdatePermissionDto {
    @ApiProperty({
        required: true,
        description: 'Permission list of role',
        isArray: true,
        default: [],
        type: () => RolePermissionsDto,
    })
    @Type(() => RolePermissionsDto)
    @IsNotEmpty()
    @IsArray()
    readonly permissions: RolePermissionsDto[];
}
