import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { faker } from '@faker-js/faker';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    Session,
} from '@generated/prisma-client';
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';
import { UserRefResponseDto } from '@modules/user/dtos/response/user.ref.response.dto';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

export class DeviceOwnershipResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        description: 'Device ownership ID',
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    deviceId: string;

    @ApiProperty({
        required: true,
        description: 'Device information',
        type: DeviceResponseDto,
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
            name: faker.commerce.productName(),
            platform: EnumDevicePlatform.android,
            lastActiveAt: faker.date.recent().toISOString(),
            notificationProvider: EnumDeviceNotificationProvider.fcm,
        },
    })
    @Expose()
    @Type(() => DeviceResponseDto)
    device: DeviceResponseDto;

    @ApiProperty({
        required: true,
        description: 'User ID who owns the device',
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: false,
        description: 'Date the device ownership was revoked',
        example: faker.date.recent(),
    })
    @Expose()
    revokedAt: Date | null;

    @ApiProperty({
        required: true,
        description: 'Indicates if the device ownership is revoked',
        example: true,
    })
    @Expose()
    isRevoked: boolean;

    @ApiProperty({
        required: false,
        description: 'User ID who revoked the device ownership',
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    revokedById: string | null;

    @ApiProperty({
        required: false,
        description: 'User who revoked the device ownership',
        type: UserRefResponseDto,
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
            name: faker.person.fullName(),
            username: faker.internet.username().toLowerCase(),
            photo: {
                bucket: faker.string.alpha({ length: 10, casing: 'upper' }),
                key: faker.system.filePath(),
                cdnUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                completedUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                mime: 'image/jpeg',
                extension: 'jpg',
                access: EnumAwsS3Accessibility.public,
                size: 1024,
            },
        },
    })
    @Expose()
    @Type(() => UserRefResponseDto)
    revokedBy: UserRefResponseDto | null;

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
