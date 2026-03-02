import { ApiProperty } from '@nestjs/swagger';
import { EnumNotificationChannel, EnumNotificationType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';

export class NotificationUserSettingRequestDto {
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
        enum: EnumNotificationType,
        example: EnumNotificationType.securityAlert,
    })
    @IsEnum(EnumNotificationType)
    @IsNotEmpty()
    type: EnumNotificationType;

    @ApiProperty({
        required: true,
        example: true,
    })
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
