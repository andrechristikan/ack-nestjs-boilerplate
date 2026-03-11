import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    Session,
} from '@generated/prisma-client';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

export class DeviceResponseDto extends DatabaseDto {
    @ApiHideProperty()
    @Exclude()
    fingerprint: string;

    @ApiProperty({
        required: false,
        description: 'Device name',
        example: faker.commerce.productName(),
    })
    name?: string;

    @ApiProperty({
        required: true,
        description: 'Device platform',
        example: EnumDevicePlatform.android,
        enum: EnumDevicePlatform,
    })
    platform: EnumDevicePlatform;

    @ApiProperty({
        required: true,
        description: 'Last active date',
        example: faker.date.recent().toISOString(),
    })
    lastActiveAt: Date;

    @ApiHideProperty()
    @Exclude()
    notificationToken?: string;

    @ApiProperty({
        required: false,
        description: 'Device notification provider',
        example: EnumDeviceNotificationProvider.fcm,
        enum: EnumDeviceNotificationProvider,
    })
    notificationProvider?: EnumDeviceNotificationProvider;
}
