import { Module } from '@nestjs/common';
import { AppController } from 'src/app/app.controller';
import { AppService } from 'src/app/app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'src/database/database.service';
import { DatabaseModule } from 'src/database/database.module';
import { ResponseModule } from 'src/response/response.module';
import { LanguageModule } from 'src/language/language.module';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from 'src/logger/logger.service';
import { LoggerModule } from 'src/logger/logger.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import Configuration from 'src/config/configuration';
import { HashModule } from 'src/hash/hash.module';
import { PaginationModule } from 'src/pagination/pagination.module';
import {
    MiddlewareBeforeModule,
    MiddlewareAfterModule
} from 'src/middleware/middleware.module';

@Module({
    controllers: [AppController],
    providers: [AppService],
    imports: [
        MiddlewareBeforeModule,
        MiddlewareAfterModule,
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
        LanguageModule,
        LoggerModule,
        ResponseModule,
        PaginationModule,
        HashModule,

        AuthModule,
        UserModule
    ]
})
export class AppModule {}
