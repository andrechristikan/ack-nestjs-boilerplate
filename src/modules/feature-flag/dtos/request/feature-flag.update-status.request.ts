import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsNumber,
    Max,
    Min,
} from 'class-validator';

export class FeatureFlagUpdateStatusRequestDto {
    @ApiProperty({
        description: 'Status of the feature flag',
        example: true,
    })
    @IsBoolean()
    @IsNotEmpty()
    isEnable: boolean;

    @ApiProperty({
        description: 'Feature flag rollout percentage (0-100)',
        example: 50,
    })
    @IsNotEmpty()
    @IsNumber()
    @IsInt()
    @Min(0)
    @Max(100)
    rolloutPercent: number;
}
