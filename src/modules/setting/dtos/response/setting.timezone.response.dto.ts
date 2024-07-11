import { ApiProperty } from '@nestjs/swagger';

export class SettingTimezoneResponseDto {
    @ApiProperty({
        required: true,
    })
    timezone: string;

    @ApiProperty({
        required: true,
    })
    timezoneOffset: string;
}
