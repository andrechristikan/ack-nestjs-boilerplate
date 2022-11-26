import { Global, Module } from '@nestjs/common';
import { SettingMiddlewareModule } from 'src/common/setting/middleware/setting.middleware.module';
import { SettingRepositoryModule } from 'src/common/setting/repository/setting.repository.module';
import { SettingBulkService } from './services/setting.bulk.service';
import { SettingService } from './services/setting.service';

@Global()
@Module({
    imports: [SettingRepositoryModule, SettingMiddlewareModule],
    exports: [SettingService, SettingBulkService],
    providers: [SettingService, SettingBulkService],
    controllers: [],
})
export class SettingModule {}
