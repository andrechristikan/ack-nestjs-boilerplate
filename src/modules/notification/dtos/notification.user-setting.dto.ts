import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { EnumNotificationChannel, EnumNotificationType } from '@generated/prisma-client';

export class NotificationUserSettingDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'User ID',
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        example: EnumNotificationType.securityAlert,
        enum: EnumNotificationType,
        description: 'Notification type',
    })
    @Expose()
    type: EnumNotificationType;

    @ApiProperty({
        required: true,
        example: EnumNotificationChannel.email,
        enum: EnumNotificationChannel,
        description: 'Notification channel',
    })
    @Expose()
    channel: EnumNotificationChannel;

    @ApiProperty({
        required: true,
        default: true,
        description: 'Whether the notification is active',
    })
    @Expose()
    isActive: boolean;
}
