import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyAdminController } from 'src/common/api-key/controllers/api-key.admin.controller';
import { PaginationModule } from 'src/common/pagination/pagination.module';
import { SettingAdminController } from 'src/modules/setting/controllers/setting.admin.controller';
import { SettingModule } from 'src/modules/setting/setting.module';
@Module({
    controllers: [ApiKeyAdminController, SettingAdminController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule, PaginationModule, SettingModule],
})
export class RoutesAdminModule {}
