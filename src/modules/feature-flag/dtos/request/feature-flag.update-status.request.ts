import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class FeatureFlagUpdateStatusRequestDto {
    @ApiProperty({
        description: 'Status of the feature flag',
        example: true,
    })
    @IsBoolean()
    @IsNotEmpty()
    isEnable: boolean;
}
