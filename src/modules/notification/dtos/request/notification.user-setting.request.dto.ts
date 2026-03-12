import { ApiProperty } from '@nestjs/swagger';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client';
import { IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';

export class NotificationUserSettingRequestDto {
    @ApiProperty({
        required: true,
        enum: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
            EnumNotificationChannel.inApp,
        ],
        example: EnumNotificationChannel.email,
    })
    @IsEnum([
        EnumNotificationChannel.email,
        EnumNotificationChannel.push,
        EnumNotificationChannel.inApp,
    ])
    @IsNotEmpty()
    channel: EnumNotificationChannel;

    @ApiProperty({
        required: true,
        enum: [
            EnumNotificationType.userActivity,
            EnumNotificationType.marketing,
        ],
        example: EnumNotificationType.userActivity,
    })
    @IsEnum([EnumNotificationType.userActivity, EnumNotificationType.marketing])
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
