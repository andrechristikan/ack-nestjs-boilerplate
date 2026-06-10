import { NotificationUserSettingDto } from '@modules/notification/dtos/notification.user-setting.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class NotificationUserSettingResponseDto {
    @ApiProperty({
        required: true,
        type: [NotificationUserSettingDto],
        isArray: true,
        description: 'List of user notification settings',
    })
    @Expose()
    @Type(() => NotificationUserSettingDto)
    settings: NotificationUserSettingDto[];
}
