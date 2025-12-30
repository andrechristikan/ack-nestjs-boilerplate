import { ApiProperty } from '@nestjs/swagger';
import { EnumNotificationPushProvider } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class NotificationRegisterPushTokenRequestDto {
    @ApiProperty({
        required: true,
        example: 'fcm-token-placeholder',
    })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({
        required: true,
        enum: EnumNotificationPushProvider,
        example: EnumNotificationPushProvider.fcm,
    })
    @IsEnum(EnumNotificationPushProvider)
    @IsNotEmpty()
    provider: EnumNotificationPushProvider;
}
