import { ApiProperty } from '@nestjs/swagger';

export class SettingFileSerialization {
    @ApiProperty({
        required: true,
    })
    readonly sizeInBytes: number;

    @ApiProperty({
        required: true,
    })
    readonly sizeMediumInBytes: number;

    @ApiProperty({
        required: true,
    })
    readonly sizeLargeInBytes: number;
}
