import { Module } from '@nestjs/common';
import { HelloPublicController } from 'src/modules/hello/controllers/hello.public.controller';
import { SettingPublicController } from 'src/modules/setting/controllers/setting.public.controller';
import { SettingModule } from 'src/modules/setting/setting.module';

@Module({
    controllers: [HelloPublicController, SettingPublicController],
    providers: [],
    exports: [],
    imports: [SettingModule],
})
export class RoutesPublicModule {}
