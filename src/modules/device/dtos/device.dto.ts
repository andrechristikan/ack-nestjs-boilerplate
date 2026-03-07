import { EnumDevicePlatform } from '@generated/prisma-client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeviceDto {
    @ApiProperty({
        description: 'Device fingerprint to uniquely identify the device',
        example: 'abc123def456ghi789jkl012mno345pq',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    fingerprint: string;

    @ApiProperty({
        description: 'Device name',
        example: "John's iPhone 12",
        required: false,
    })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({
        description: 'Device platform',
        example: EnumDevicePlatform.ios,
        required: true,
        enum: EnumDevicePlatform,
    })
    @IsEnum(EnumDevicePlatform)
    @IsString()
    platform: EnumDevicePlatform;

    @ApiProperty({
        description: 'Notification token for push notifications',
        example: 'fcm_token_1234567890abcdef',
        required: false,
    })
    @IsString()
    @IsOptional()
    notificationToken?: string;
}
