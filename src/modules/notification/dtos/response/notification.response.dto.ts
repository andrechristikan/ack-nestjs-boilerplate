import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { EnumNotificationType } from '@prisma/client';

export class NotificationResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    userId: string;

    @ApiProperty({
        required: true,
        example: EnumNotificationType.login,
        enum: EnumNotificationType,
    })
    type: EnumNotificationType;

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
}
