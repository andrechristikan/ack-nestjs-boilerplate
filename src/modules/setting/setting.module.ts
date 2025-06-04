import { Module } from '@nestjs/common';
import { SettingService } from '@module/setting/services/setting.service';

@Module({
    imports: [],
    exports: [SettingService],
    providers: [SettingService],
    controllers: [],
})
export class SettingModule {}
