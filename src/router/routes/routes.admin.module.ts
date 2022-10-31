import { Module } from '@nestjs/common';
import { SettingAdminController } from 'src/common/setting/controllers/setting.admin.controller';

@Module({
    controllers: [SettingAdminController],
    providers: [],
    exports: [],
    imports: [],
})
export class RoutesAdminModule {}
