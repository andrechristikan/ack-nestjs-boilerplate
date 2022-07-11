import { Module } from '@nestjs/common';
import { MessageModule } from 'src/message/message.module';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { DebuggerModule } from 'src/debugger/debugger.module';
import Configs from 'src/config/index';
import { AuthModule } from 'src/auth/auth.module';
import { PaginationModule } from 'src/pagination/pagination.module';
import { HelperModule } from 'src/utils/helper/helper.module';
import { MiddlewareModule } from 'src/utils/middleware/middleware.module';
import { DebuggerOptionService } from 'src/debugger/service/debugger.option.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import { DatabaseOptionsService } from 'src/database/service/database.options.service';
import { LoggerModule } from 'src/logger/logger.module';
import { RequestModule } from 'src/utils/request/request.module';
import { ErrorModule } from 'src/utils/error/error.module';
import { SettingModule } from 'src/setting/setting.module';
import { VersionModule } from 'src/utils/version/version.module';
import { ResponseModule } from 'src/utils/response/response.module';
import { DatabaseModule } from 'src/database/database.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
    controllers: [],
    providers: [],
    imports: [
        ConfigModule.forRoot({
            load: Configs,
            ignoreEnvFile: false,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env'],
        }),
        WinstonModule.forRootAsync({
            inject: [DebuggerOptionService],
            imports: [DebuggerModule],
            useFactory: (debuggerOptionsService: DebuggerOptionService) =>
                debuggerOptionsService.createLogger(),
        }),
        MongooseModule.forRootAsync({
            connectionName: DATABASE_CONNECTION_NAME,
            inject: [DatabaseOptionsService],
            imports: [DatabaseModule],
            useFactory: (databaseOptionsService: DatabaseOptionsService) =>
                databaseOptionsService.createMongooseOptions(),
        }),
        HelperModule,
        DebuggerModule,
        MessageModule,
        ErrorModule,
        ResponseModule,
        PaginationModule,
        SettingModule,
        RequestModule,
        VersionModule,
        MiddlewareModule,
        LoggerModule,
        CacheModule,
        AuthModule,
    ],
})
export class CoreModule {}
