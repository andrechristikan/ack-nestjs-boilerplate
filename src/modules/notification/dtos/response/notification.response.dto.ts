import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client';

export class NotificationResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user the notification belongs to',
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        example: EnumNotificationType.securityAlert,
        enum: EnumNotificationType,
        description: 'Type of the notification',
    })
    @Expose()
    type: EnumNotificationType;

    @ApiProperty({
        required: true,
        example: EnumNotificationPriority.high,
        enum: EnumNotificationPriority,
        description: 'Priority of the notification',
    })
    @Expose()
    priority: EnumNotificationPriority;

    @ApiProperty({
        required: true,
        example: 'Login',
        description: 'Title shown to the user',
    })
    @Expose()
    title: string;

    @ApiProperty({
        required: true,
        example: 'Login from web via credential',
        description: 'Body text shown to the user',
    })
    @Expose()
    body: string;

    @ApiProperty({
        required: false,
        example: { exampleKey: 'exampleValue' },
        description: 'Additional payload attached to the notification',
    })
    @Expose()
    metadata?: unknown;

    @ApiProperty({
        required: true,
        example: false,
        description: 'Whether the user has read the notification',
    })
    @Expose()
    isRead: boolean;

    @ApiProperty({
        required: false,
        example: faker.date.recent(),
        description: 'When the user read the notification',
    })
    @Expose()
    readAt?: Date;
}
