import { PickType } from '@nestjs/swagger';
import { SettingFeatureCreateRequestDto } from './setting-feature.create.request.dto';

export class SettingFeatureUpdateRequestDto extends PickType(
    SettingFeatureCreateRequestDto,
    ['description', 'value'] as const
) {}
