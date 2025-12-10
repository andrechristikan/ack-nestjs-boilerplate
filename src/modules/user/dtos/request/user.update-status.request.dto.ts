import { ApiProperty } from '@nestjs/swagger';
import { EnumUserStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UserUpdateStatusRequestDto {
    @ApiProperty({
        required: true,
        enum: EnumUserStatus,
        default: EnumUserStatus.active,
    })
    @IsString()
    @IsEnum(EnumUserStatus)
    @IsNotEmpty()
    status: EnumUserStatus;
}
