import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsInt,
    IsMongoId,
    IsNotEmpty,
    IsNumber,
    IsOptional,
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

    @ApiProperty({
        description: 'Target user ids allow-list; omit to keep, [] to clear',
        example: [],
        type: [String],
        required: false,
    })
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    targetUserIds?: string[];
}
