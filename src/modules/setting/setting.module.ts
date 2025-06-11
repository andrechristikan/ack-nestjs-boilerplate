import { Module } from '@nestjs/common';
import { SettingDbService } from '@modules/setting/services/setting.db.service';
import { SettingRepositoryModule } from '@modules/setting/repository/setting.repository.module';
import { SettingService } from '@modules/setting/services/setting.service';

@Module({
    imports: [SettingRepositoryModule],
    exports: [SettingDbService, SettingService],
    providers: [SettingDbService, SettingService],
    controllers: [],
})
export class SettingModule {}
