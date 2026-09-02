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
        description: 'Notification channel to update',
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
        description: 'Notification type to update',
    })
    @IsEnum([EnumNotificationType.userActivity, EnumNotificationType.marketing])
    @IsNotEmpty()
    type: EnumNotificationType;

    @ApiProperty({
        required: true,
        example: true,
        description: 'Whether notifications of this type and channel are active',
    })
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
