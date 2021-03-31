import { Module } from '@nestjs/common';
import { AppController } from 'src/app/app.controller';
import { AppService } from 'src/app/app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';
import { ResponseModule } from 'src/response/response.module';
import { MessageModule } from 'src/message/message.module';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from 'src/logger/logger.service';
import { LoggerModule } from 'src/logger/logger.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import Configuration from 'src/config/configuration';
import { HashModule } from 'src/hash/hash.module';
import { PaginationModule } from 'src/pagination/pagination.module';
import { MiddlewareModule } from 'src/middleware/middleware.module';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseFilter } from 'src/response/response.filter';
import { EncryptionInterceptor } from 'src/encryption/encryption.interceptor';
import { ResponseInterceptor } from 'src/response/response.interceptor';

@Module({
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_FILTER,
            useClass: ResponseFilter
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseInterceptor
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: EncryptionInterceptor
        }
    ],
    imports: [
        MiddlewareModule,
        EncryptionModule,
        ConfigModule.forRoot({
            load: [Configuration],
            ignoreEnvFile: true,
            isGlobal: true,
            cache: true
        }),
        WinstonModule.forRootAsync({
            inject: [LoggerService],
            imports: [LoggerModule],
            useFactory: (loggerService: LoggerService) =>
                loggerService.createLogger()
        }),
        MongooseModule.forRootAsync({
            inject: [DatabaseService],
            imports: [DatabaseModule],
            useFactory: (databaseService: DatabaseService) => {
                return databaseService.createMongooseOptions();
            }
        }),
        MessageModule,
        LoggerModule,
        ResponseModule,
        PaginationModule,
        HashModule,

        AuthModule,
        UserModule
    ]
})
export class AppModule {}
