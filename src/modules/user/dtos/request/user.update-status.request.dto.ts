import { ApiProperty } from '@nestjs/swagger';
import { ENUM_USER_STATUS } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UserUpdateStatusRequestDto {
    @ApiProperty({
        required: true,
        enum: ENUM_USER_STATUS,
        default: ENUM_USER_STATUS.active,
    })
    @IsString()
    @IsEnum(ENUM_USER_STATUS)
    @IsNotEmpty()
    status: ENUM_USER_STATUS;
}
