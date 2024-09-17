import { ApiProperty } from '@nestjs/swagger';

export class SettingMiddlewareResponseDto {
    @ApiProperty({
        required: true,
    })
    bodyJson: number;

    @ApiProperty({
        required: true,
    })
    bodyRaw: number;

    @ApiProperty({
        required: true,
    })
    bodyText: number;

    @ApiProperty({
        required: true,
    })
    bodyUrlencoded: number;
}
