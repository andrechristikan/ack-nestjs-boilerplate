import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { AppController } from 'app/app.controller';
import { AppService } from 'app/app.service';

import { WinstonModule } from 'nest-winston';
import { LoggerService } from 'middleware/logger/logger.service';
import { LoggerModule } from 'middleware/logger/logger.module';

import { LoggerMiddleware } from 'middleware/logger/logger.middleware';
import { BodyParserUrlencodedMiddleware } from 'middleware/body-parser/body-parser-urlencoded.middleware';
import { BodyParserJsonMiddleware } from 'middleware/body-parser/body-parser-json.middleware';
import { ResponseBodyMiddleware } from 'response/response.middleware';
import { HelmetMiddleware } from 'middleware/helmet/helmet.middleware';
import { RateLimitMiddleware } from 'middleware/rate-limit/rate-limit.middleware';

import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'database/database.service';
import { DatabaseModule } from 'database/database.module';

import { ResponseModule } from 'response/response.module';
import { LanguageModule } from 'language/language.module';
import { ConfigModule } from '@nestjs/config';

import { UserModule } from 'user/user.module';
import { AuthModule } from 'auth/auth.module';

import Configuration from 'config/configuration';
import { PaginationModule } from 'pagination/pagination.module';

@Module({
    controllers: [AppController],
    providers: [AppService],
    imports: [
        ConfigModule.forRoot({
            // envFilePath: '.env',
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

        AuthModule,
        UserModule
    ]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        //! middleware
        consumer
            .apply(
                ResponseBodyMiddleware,
                LoggerMiddleware,
                BodyParserUrlencodedMiddleware,
                BodyParserJsonMiddleware,
                HelmetMiddleware,
                RateLimitMiddleware
            )
            .forRoutes('*');
    }
}
