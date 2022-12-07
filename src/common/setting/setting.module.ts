import { Global, Module } from '@nestjs/common';
import { SettingMiddlewareModule } from 'src/common/setting/middleware/setting.middleware.module';
import { SettingRepositoryModule } from 'src/common/setting/repository/setting.repository.module';
import { SettingUseCase } from 'src/common/setting/use-cases/setting.use-case';
import { SettingBulkService } from './services/setting.bulk.service';
import { SettingService } from './services/setting.service';

@Global()
@Module({
    imports: [SettingRepositoryModule, SettingMiddlewareModule],
    exports: [SettingService, SettingBulkService, SettingUseCase],
    providers: [SettingService, SettingBulkService, SettingUseCase],
    controllers: [],
})
export class SettingModule {}
