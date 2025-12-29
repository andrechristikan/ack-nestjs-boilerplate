import { ApiProperty } from '@nestjs/swagger';
import { EnumNotificationChannel, EnumNotificationSettingType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';

export class UserUpdateNotificationSettingRequestDto {
    @ApiProperty({
        required: true,
        enum: EnumNotificationChannel,
        example: EnumNotificationChannel.email,
    })
    @IsEnum(EnumNotificationChannel)
    @IsNotEmpty()
    channel: EnumNotificationChannel;

    @ApiProperty({
        required: true,
        enum: EnumNotificationSettingType,
        example: EnumNotificationSettingType.login,
    })
    @IsEnum(EnumNotificationSettingType)
    @IsNotEmpty()
    type: EnumNotificationSettingType;

    @ApiProperty({
        required: true,
        example: true,
    })
    @IsBoolean()
    @IsNotEmpty()
    enabled: boolean;
}
