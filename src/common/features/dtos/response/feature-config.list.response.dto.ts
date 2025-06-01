import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { FeatureConfigGetResponseDto } from '@common/features/dtos/response/feature-config.get.response.dto';
import { Exclude } from 'class-transformer';

export class FeatureConfigListResponseDto extends OmitType(
    FeatureConfigGetResponseDto,
    ['_id', '__v', 'deleted'] as const
) {
    @ApiHideProperty()
    @Exclude()
    _id: string;

    @ApiHideProperty()
    @Exclude()
    __v?: string;

    @ApiHideProperty()
    @Exclude()
    deleted: boolean;
}
