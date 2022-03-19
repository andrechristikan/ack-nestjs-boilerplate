import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';
import { MessageModule } from 'src/message/message.module';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { DebuggerOptionService } from 'src/debugger/debugger.service';
import { DebuggerModule } from 'src/debugger/debugger.module';
import { PaginationModule } from 'src/pagination/pagination.module';
import Configs from 'src/config/index';
import { HelperModule } from 'src/helper/helper.module';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import { MiddlewareModule } from 'src/middleware/middleware.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    controllers: [],
    providers: [],
    imports: [
        MiddlewareModule,
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
            useFactory: (loggerService: DebuggerOptionService) =>
                loggerService.createLogger(),
        }),
        MongooseModule.forRootAsync({
            connectionName: DATABASE_CONNECTION_NAME,
            inject: [DatabaseService],
            imports: [DatabaseModule],
            useFactory: (databaseService: DatabaseService) =>
                databaseService.createMongooseOptions(),
        }),
        MessageModule,
        PaginationModule,
        DebuggerModule,
        HelperModule,
        AuthModule,
    ],
})
export class CoreModule {}
