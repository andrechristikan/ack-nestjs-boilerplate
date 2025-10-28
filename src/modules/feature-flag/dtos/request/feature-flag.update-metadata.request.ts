import { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { IsFeatureFlagMetadata } from '@modules/feature-flag/validations/feature-flag.metadata.validation';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class FeatureFlagUpdateMetadataRequestDto {
    @ApiProperty({
        description: 'Feature flag metadata in JSON format',
        example: {
            newFeature: true,
            betaUserAccess: false,
            maxRetries: 3,
            apiEndpoint: 'https://api.example.com',
        },
        required: false,
    })
    @IsNotEmpty()
    @IsObject()
    @IsFeatureFlagMetadata()
    metadata: IFeatureFlagMetadata;
}
