import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { EnumNotificationPriority, EnumNotificationType } from '@generated/prisma-client';

export class NotificationResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        example: EnumNotificationType.securityAlert,
        enum: EnumNotificationType,
    })
    @Expose()
    type: EnumNotificationType;

    @ApiProperty({
        required: true,
        example: EnumNotificationPriority.high,
        enum: EnumNotificationPriority,
    })
    @Expose()
    priority: EnumNotificationPriority;

    @ApiProperty({
        required: true,
        example: 'Login',
    })
    @Expose()
    title: string;

    @ApiProperty({
        required: true,
        example: 'Login from web via credential',
    })
    @Expose()
    body: string;

    @ApiProperty({
        required: false,
        example: { exampleKey: 'exampleValue' },
    })
    @Expose()
    metadata?: unknown;

    @ApiProperty({
        required: true,
        example: false,
    })
    @Expose()
    isRead: boolean;

    @ApiProperty({
        required: false,
        example: faker.date.recent(),
    })
    @Expose()
    readAt?: Date;
}
