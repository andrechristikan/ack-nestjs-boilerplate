import { PipeTransform, Injectable, NotFoundException } from '@nestjs/common';
import { SettingFeatureService } from '@modules/setting/services/setting-feature.service';
import { SettingFeatureDoc } from '@modules/setting/repository/entities/setting-feature.entity';
import { ENUM_SETTING_FEATURE_STATUS_CODE_ERROR } from '@modules/setting/enums/setting.enum.status-code';

@Injectable()
export class SettingFeatureParseByKeyPipe implements PipeTransform {
    constructor(
        private readonly settingFeatureService: SettingFeatureService
    ) {}

    async transform(value: string): Promise<SettingFeatureDoc> {
        const settingFeature: SettingFeatureDoc =
            await this.settingFeatureService.findOneByKey(value);
        if (!settingFeature) {
            throw new NotFoundException({
                statusCode: ENUM_SETTING_FEATURE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'settingFeature.error.notFound',
            });
        }

        return settingFeature;
    }
}
