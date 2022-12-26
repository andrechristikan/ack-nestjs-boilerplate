import { Global, Module } from '@nestjs/common';
import { SettingMiddlewareModule } from 'src/common/setting/middleware/setting.middleware.module';
import { SettingRepositoryModule } from 'src/common/setting/repository/setting.repository.module';
import { SettingService } from './services/setting.service';

@Global()
@Module({
    imports: [SettingRepositoryModule, SettingMiddlewareModule],
    exports: [SettingService],
    providers: [SettingService],
    controllers: [],
})
export class SettingModule {}
