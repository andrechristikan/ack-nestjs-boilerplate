import { ApiProperty } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import { EnumNotificationType } from '@prisma/client';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class NotificationPushJobDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        required: true,
        enum: EnumNotificationType,
        example: EnumNotificationType.login,
    })
    @IsNotEmpty()
    type: EnumNotificationType;

    @ApiProperty({
        required: true,
        example: 'Login',
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        required: true,
        example: 'Login from web via credential',
    })
    @IsString()
    @IsNotEmpty()
    body: string;

    @ApiProperty({
        required: false,
        example: { exampleKey: 'exampleValue' },
    })
    @IsObject()
    @IsOptional()
    data?: Record<string, unknown>;

    @ApiProperty({
        required: false,
        example: faker.database.mongodbObjectId(),
    })
    @IsString()
    @IsOptional()
    notificationId?: string;
}
