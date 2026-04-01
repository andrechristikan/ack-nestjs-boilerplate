import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { ApiProperty } from '@nestjs/swagger';

export class FeatureFlagResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        description: 'Feature flag key',
    })
    key: string;

    @ApiProperty({
        description: 'Feature flag status',
    })
    isEnable: boolean;

    @ApiProperty({
        description: 'Feature flag metadata in JSON format',
    })
    metadata: IFeatureFlagMetadata;
}
