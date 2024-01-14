import { ApiProperty } from '@nestjs/swagger';

export class SettingTimezoneSerialization {
    @ApiProperty({
        required: true,
    })
    readonly timezone: string;

    @ApiProperty({
        required: true,
    })
    readonly timezoneOffset: string;
}
