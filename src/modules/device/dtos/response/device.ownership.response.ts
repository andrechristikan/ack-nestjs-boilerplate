import { faker } from '@faker-js/faker';
import { Session } from '@generated/prisma-client';
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

export class DeviceOwnershipResponseDto {
    @ApiProperty({
        required: true,
        description: 'Device ownership ID',
        example: faker.database.mongodbObjectId(),
    })
    deviceId: string;

    @ApiProperty({
        required: true,
        description: 'Device information',
        type: DeviceResponseDto,
    })
    @Type(() => DeviceResponseDto)
    device: DeviceResponseDto;

    @ApiProperty({
        required: true,
        description: 'User ID who owns the device',
        example: faker.database.mongodbObjectId(),
    })
    userId: string;

    @ApiProperty({
        required: true,
        description: 'Indicates if the device ownership is revoked',
        example: true,
    })
    revokedAt?: Date;

    @ApiProperty({
        required: true,
        description: 'Indicates if the device ownership is revoked',
        example: true,
    })
    isRevoked: boolean;

    @ApiProperty({
        required: true,
        description: 'User ID who revoked the device ownership',
        example: faker.database.mongodbObjectId(),
    })
    revokedById?: string;

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
