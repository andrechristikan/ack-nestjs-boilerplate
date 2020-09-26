import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from 'app/app.controller';
import { AppService } from 'app/app.service';

import { WinstonModule } from 'nest-winston';
import { LoggerService } from 'logger/logger.service';
import { LoggerModule } from 'logger/logger.module';

import { LoggerMiddleware } from 'logger/logger.middleware';
import { BodyParserUrlencodedMiddleware } from 'body-parser/body-parser-urlencoded.middleware';
import { BodyParserJsonMiddleware } from 'body-parser/body-parser-json.middleware';
import { ResponseBodyMiddleware } from 'response/response.middleware';

import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'database/database.service';
import { DatabaseModule } from 'database/database.module';

import { ResponseModule } from 'response/response.module';
import { LanguageModule } from 'language/language.module';
import { ErrorModule } from 'error/error.module';
import { ConfigModule } from 'config/config.module';

import { CountryModule } from 'components/country/country.module';
import { UserModule } from 'components/user/user.module';

@Module({
    controllers: [AppController],
    providers: [AppService],
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

        CountryModule,
        UserModule
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
