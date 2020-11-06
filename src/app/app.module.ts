import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { AppController } from 'app/app.controller';
import { AppService } from 'app/app.service';

import { WinstonModule } from 'nest-winston';
import { LoggerService } from 'middleware/logger/logger.service';
import { LoggerModule } from 'middleware/logger/logger.module';

import { LoggerMiddleware } from 'middleware/logger/logger.middleware';
import { BodyParserUrlencodedMiddleware } from 'middleware/body-parser/body-parser-urlencoded.middleware';
import { BodyParserJsonMiddleware } from 'middleware/body-parser/body-parser-json.middleware';
import { ResponseBodyMiddleware } from 'middleware/response/response.middleware';

import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'database/database.service';
import { DatabaseModule } from 'database/database.module';

import { ResponseModule } from 'middleware/response/response.module';
import { LanguageModule } from 'language/language.module';
import { ErrorModule } from 'error/error.module';
import { ConfigModule } from 'config/config.module';

import { CountryModule } from 'country/country.module';
import { UserModule } from 'user/user.module';
import { AuthModule } from 'auth/auth.module';

@Module({
    controllers: [AppController],
    providers: [
        AppService,
    ],
    imports: [
        ConfigModule,
        WinstonModule.forRootAsync({
            inject: [LoggerService],
            imports: [LoggerModule],
            useFactory: (loggerService: LoggerService) =>
                loggerService.createLogger()
        }),
        MongooseModule.forRootAsync({
            imports: [DatabaseModule],
            inject: [DatabaseService],
            useFactory: (databaseService: DatabaseService) =>
                databaseService.createMongooseOptions()
        }),
        LanguageModule,
        LoggerModule,
        ResponseModule,
        ErrorModule,

        AuthModule,
        CountryModule,
        UserModule,
    ]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        //! middleware

        //? logger
        consumer
            .apply(
                LoggerMiddleware,
                BodyParserUrlencodedMiddleware,
                BodyParserJsonMiddleware,
                ResponseBodyMiddleware
            )
            .forRoutes('*');
    }
}
