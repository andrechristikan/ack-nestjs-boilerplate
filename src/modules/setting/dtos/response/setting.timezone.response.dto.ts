import { ApiProperty } from '@nestjs/swagger';

export class SettingTimezoneResponseDto {
    @ApiProperty({
        required: true,
    })
    readonly timezone: string;

    @ApiProperty({
        required: true,
    })
    readonly timezoneOffset: string;
}
