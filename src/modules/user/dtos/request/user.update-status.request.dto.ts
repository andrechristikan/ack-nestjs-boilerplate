import { ApiProperty } from '@nestjs/swagger';
import { EnumUserStatus } from '@generated/prisma-client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UserUpdateStatusRequestDto {
    @ApiProperty({
        required: true,
        enum: EnumUserStatus,
        default: EnumUserStatus.active,
        example: EnumUserStatus.active,
        description: 'Account status to set on the user',
    })
    @IsString()
    @IsEnum(EnumUserStatus)
    @IsNotEmpty()
    status: EnumUserStatus;
}
