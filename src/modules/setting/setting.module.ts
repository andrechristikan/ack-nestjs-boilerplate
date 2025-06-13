import { Module } from '@nestjs/common';
import { SettingRepositoryModule } from '@modules/setting/repository/setting.repository.module';
import { SettingService } from '@modules/setting/services/setting.service';
import { SettingFeatureService } from '@modules/setting/services/setting-feature.service';

@Module({
    imports: [SettingRepositoryModule],
    exports: [SettingFeatureService, SettingService],
    providers: [SettingFeatureService, SettingService],
    controllers: [],
})
export class SettingModule {}
