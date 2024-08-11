import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { ApiKeyAdminController } from 'src/modules/api-key/controllers/api-key.admin.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuthAdminController } from 'src/modules/auth/controllers/auth.admin.controller';
import { CountryAdminController } from 'src/modules/country/controllers/country.admin.controller';
import { CountryModule } from 'src/modules/country/country.module';
import { EmailModule } from 'src/modules/email/email.module';
import { RoleAdminController } from 'src/modules/role/controllers/role.admin.controller';
import { RoleModule } from 'src/modules/role/role.module';
import { SettingAdminController } from 'src/modules/setting/controllers/setting.admin.controller';
import { SettingModule } from 'src/modules/setting/setting.module';
import { UserAdminController } from 'src/modules/user/controllers/user.admin.controller';
import { UserModule } from 'src/modules/user/user.module';
import { WORKER_CONNECTION_NAME } from 'src/worker/constants/worker.constant';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@Module({
    controllers: [
        ApiKeyAdminController,
        SettingAdminController,
        RoleAdminController,
        UserAdminController,
        CountryAdminController,
        AuthAdminController,
    ],
    providers: [],
    exports: [],
    imports: [
        ApiKeyModule,
        SettingModule,
        RoleModule,
        UserModule,
        AuthModule,
        EmailModule,
        CountryModule,
        BullModule.registerQueue({
            connection: {
                name: WORKER_CONNECTION_NAME,
            },
            name: ENUM_WORKER_QUEUES.EMAIL_QUEUE,
        }),
    ],
})
export class RoutesAdminModule {}
