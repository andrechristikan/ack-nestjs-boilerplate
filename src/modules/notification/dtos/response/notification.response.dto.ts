import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import {
    EnumNotificationPriority,
    EnumNotificationType,
} from '@generated/prisma-client';

export class NotificationResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    userId: string;

    @ApiProperty({
        required: true,
        example: EnumNotificationType.securityAlert,
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
    metadata?: unknown;

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
}
