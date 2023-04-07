import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/common/auth/auth.module';
import { HealthModule } from 'src/health/health.module';
import { HealthPublicController } from 'src/health/controllers/health.public.controller';
import { MessagePublicController } from 'src/common/message/controllers/message.public.controller';
import { SettingPublicController } from 'src/common/setting/controllers/setting.public.controller';
import { UserPublicController } from 'src/modules/user/controllers/user.public.controller';
import { UserModule } from 'src/modules/user/user.module';
import { RoleModule } from 'src/common/role/role.module';

@Module({
    controllers: [
        HealthPublicController,
        MessagePublicController,
        SettingPublicController,
        UserPublicController,
    ],
    providers: [],
    exports: [],
    imports: [TerminusModule, HealthModule, UserModule, AuthModule, RoleModule],
})
export class RoutesPublicModule {}
