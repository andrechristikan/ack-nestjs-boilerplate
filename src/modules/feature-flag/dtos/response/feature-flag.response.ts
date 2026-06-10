import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FeatureFlagResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        description: 'Feature flag key',
    })
    @Expose()
    key: string;

    @ApiProperty({
        description: 'Feature flag status',
    })
    @Expose()
    isEnable: boolean;

    @ApiProperty({
        description: 'Feature flag metadata in JSON format',
    })
    @Expose()
    metadata: IFeatureFlagMetadata;
}
