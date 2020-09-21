import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from 'components/app/app.controller';
import { AppService } from 'components/app/app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'common/database/database.service';
import { DatabaseModule } from 'common/database/database.module';
import { UserModule } from 'components/user/user.module';
import { CountryModule } from 'components/country/country.module';
import { ResponseModule } from 'common/response/response.module';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from 'common/logger/logger.service';
import { LoggerModule } from 'common/logger/logger.module';
import { LoggerMiddleware } from 'common/logger/logger.middleware';
import { BodyParserUrlencodedMiddleware } from 'common/body-parser/body-parser-urlencoded.middleware';
import { BodyParserJsonMiddleware } from 'common/body-parser/body-parser-json.middleware';
import { ResponseBodyMiddleware } from 'common/response/response.middleware';

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
