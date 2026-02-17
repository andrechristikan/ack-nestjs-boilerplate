import { faker } from '@faker-js/faker';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    Session,
} from '@generated/prisma-client';
import { DeviceDto } from '@modules/device/dtos/device.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

export class DeviceResponseDto extends DeviceDto {
    @ApiProperty({
        required: true,
        description: 'User ID',
        example: faker.database.mongodbObjectId(),
    })
    userId: string;

    @ApiProperty({
        required: true,
        description: 'User information',
        type: UserListResponseDto,
    })
    @Type(() => UserListResponseDto)
    user: UserListResponseDto;

    @ApiProperty({
        required: true,
        description: 'Device fingerprint',
        example: faker.string.alphanumeric(32),
    })
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

    @ApiProperty({
        required: false,
        description: 'Device notification token',
        example: faker.string.alphanumeric(64),
    })
    notificationToken?: string;

    @ApiProperty({
        required: false,
        description: 'Device notification provider',
        example: EnumDeviceNotificationProvider.fcm,
        enum: EnumDeviceNotificationProvider,
    })
    notificationProvider?: EnumDeviceNotificationProvider;

    @ApiProperty({
        required: true,
        description: 'Session count for the device',
        example: 5,
    })
    @Transform(({ obj }) => obj._count?.sessions ?? 0)
    @Expose()
    activeSessionCount: number;

    @ApiProperty({
        required: true,
        description: 'Indicates if this is the current active device',
        example: true,
    })
    @Transform(({ obj }) => obj.sessions?.length > 0)
    @Expose()
    isCurrentDevice: boolean;

    @Exclude()
    @ApiHideProperty()
    _count: {
        sessions: number;
    };

    @Exclude()
    @ApiHideProperty()
    sessions?: Session[];
}
