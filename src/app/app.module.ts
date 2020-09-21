import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from 'app/app.controller';
import { AppService } from 'app/app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'database/database.service';
import { DatabaseModule } from 'database/database.module';
import { UserModule } from 'user/user.module';
import { CountryModule } from 'country/country.module';
import { ResponseModule } from 'helper/response/response.module';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from 'logger/logger.service';
import { LoggerModule } from 'logger/logger.module';
import { LoggerMiddleware } from 'logger/logger.middleware';
import { BodyParserUrlencodedMiddleware } from 'helper/body-parser/body-parser-urlencoded.middleware';
import { BodyParserJsonMiddleware } from 'helper/body-parser/body-parser-json.middleware';
import { ResponseBodyMiddleware } from 'helper/response/response.middleware';

@Module({
    controllers: [AppController],
    providers: [AppService],
    imports: [
        MongooseModule.forRootAsync({
            imports: [DatabaseModule],
            inject: [DatabaseService],
            useFactory: (databaseService: DatabaseService) =>
                databaseService.createMongooseOptions(),
        }),
        WinstonModule.forRootAsync({
            inject: [LoggerService],
            imports: [LoggerModule],
            useFactory: (loggerService: LoggerService) =>
                loggerService.createLogger(),
        }),
        UserModule,
        CountryModule,
        ResponseModule,
    ],
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
                ResponseBodyMiddleware,
            )
            .forRoutes('*');
    }
}
