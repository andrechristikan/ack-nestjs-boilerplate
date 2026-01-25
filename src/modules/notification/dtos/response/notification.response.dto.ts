import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
    EnumNotificationChannel,
    EnumNotificationPriority,
    EnumNotificationType,
} from '@prisma/client';
import { Exclude } from 'class-transformer';

export class NotificationResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    userId: string;

    @ApiProperty({
        required: true,
        example: EnumNotificationType.security_alert,
        enum: EnumNotificationType,
    })
    type: EnumNotificationType;

    @ApiProperty({
        required: true,
        example: EnumNotificationPriority.high,
        enum: EnumNotificationPriority,
    })
    priority: EnumNotificationPriority;

    @ApiProperty({
        required: true,
        example: EnumNotificationChannel.push,
        enum: EnumNotificationChannel,
    })
    channel: EnumNotificationChannel;

    @ApiProperty({
        required: false,
        example: faker.date.future(),
    })
    deliveryAt?: Date;

    @ApiProperty({
        required: true,
        example: 'Login',
    })
    title: string;

    @ApiProperty({
        required: true,
        example: 'Login from web via credential',
    })
    body: string;

    @ApiProperty({
        required: false,
        example: { exampleKey: 'exampleValue' },
    })
    data?: unknown;

    @ApiProperty({
        required: true,
        example: false,
    })
    isRead: boolean;

    @ApiProperty({
        required: false,
        example: faker.date.recent(),
    })
    readAt?: Date;

    @ApiHideProperty()
    @Exclude()
    attemptCount: number;

    @ApiHideProperty()
    @Exclude()
    lastAttemptAt?: Date;

    @ApiHideProperty()
    @Exclude()
    failedReason?: string;
}
