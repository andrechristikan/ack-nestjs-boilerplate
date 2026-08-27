import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class DeviceResponseDto extends DatabaseResponseDto {
    @Exclude()
    @ApiHideProperty()
    fingerprint: string;

    @ApiProperty({
        required: false,
        description: 'Device name',
        example: faker.commerce.productName(),
    })
    @Expose()
    name: string | null;

    @ApiProperty({
        required: true,
        description: 'Device platform',
        example: EnumDevicePlatform.android,
        enum: EnumDevicePlatform,
    })
    @Expose()
    platform: EnumDevicePlatform;

    @ApiProperty({
        required: true,
        description: 'Last active date',
        example: faker.date.recent().toISOString(),
    })
    @Expose()
    lastActiveAt: Date;

    @Exclude()
    @ApiHideProperty()
    notificationToken: string | null;

    @ApiProperty({
        required: false,
        description: 'Device notification provider',
        example: EnumDeviceNotificationProvider.fcm,
        enum: EnumDeviceNotificationProvider,
    })
    @Expose()
    notificationProvider: EnumDeviceNotificationProvider | null;
}
