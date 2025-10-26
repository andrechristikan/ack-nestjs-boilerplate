import { IFeatureFlagValue } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { IsFeatureFlagValue } from '@modules/feature-flag/validations/feature-flag.setting.validation';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class FeatureFlagUpdateRequestDto {
    @ApiProperty({
        description: 'Feature flag settings in JSON format',
        example: {
            newFeature: true,
            betaUserAccess: false,
            maxRetries: 3,
            apiEndpoint: 'https://api.example.com',
        },
    })
    @IsNotEmpty()
    @IsObject()
    @IsFeatureFlagValue()
    value: IFeatureFlagValue;
}
