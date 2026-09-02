import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FeatureFlagResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        description: 'Feature flag key',
        example: 'loginWithGoogle',
    })
    @Expose()
    key: string;

    @ApiProperty({
        description: 'Feature flag status',
        example: true,
    })
    @Expose()
    isEnable: boolean;

    @ApiProperty({
        description: 'Target user ids allow-list that bypasses rollout',
        type: [String],
        example: [],
    })
    @Expose()
    targetUserIds: string[];

    @ApiProperty({
        description: 'Feature flag metadata in JSON format',
        example: {},
    })
    @Expose()
    metadata: IFeatureFlagMetadata;
}
