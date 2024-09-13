import { ApiProperty } from '@nestjs/swagger';

export class SettingAuthResponseDto {
    @ApiProperty({
        required: true,
    })
    passwordMaxAttempt: number;

    @ApiProperty({
        required: true,
    })
    passwordExpiredIn: number;

    @ApiProperty({
        required: true,
    })
    passwordExpiredInTemporary: number;

    @ApiProperty({
        required: true,
    })
    passwordPeriod: number;
}
