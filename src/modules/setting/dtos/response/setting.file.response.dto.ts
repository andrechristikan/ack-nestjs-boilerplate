import { ApiProperty } from '@nestjs/swagger';

export class SettingFileResponseDto {
    @ApiProperty({
        required: true,
    })
    sizeInBytes: number;
}
