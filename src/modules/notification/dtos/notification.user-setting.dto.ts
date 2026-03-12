import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client';

export class NotificationUserSettingDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'User ID',
    })
    userId: string;

    @ApiProperty({
        required: true,
        example: EnumNotificationType.securityAlert,
        enum: EnumNotificationType,
        description: 'Notification type',
    })
    type: EnumNotificationType;

    @ApiProperty({
        required: true,
        example: EnumNotificationChannel.email,
        enum: EnumNotificationChannel,
        description: 'Notification channel',
    })
    channel: EnumNotificationChannel;

    @ApiProperty({
        required: true,
        default: true,
        description: 'Whether the notification is active',
    })
    isActive: boolean;
}
