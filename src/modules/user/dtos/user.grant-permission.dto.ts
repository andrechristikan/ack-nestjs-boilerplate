import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsArray, ArrayNotEmpty } from 'class-validator';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';

export class UserGrantPermissionDto {
    @ApiProperty({
        description: 'scope for grant permission',
        example: Object.values(ENUM_PERMISSION_GROUP),
        required: true,
        isArray: true,
    })
    @IsEnum(ENUM_PERMISSION_GROUP, { each: true })
    @IsNotEmpty()
    @IsArray()
    @ArrayNotEmpty()
    readonly scope: ENUM_PERMISSION_GROUP[];
}
