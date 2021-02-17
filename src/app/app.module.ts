import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from 'src/app/app.controller';
import { AppService } from 'src/app/app.service';
import { HttpLoggerMiddleware } from 'src/middleware/http-logger/http-logger.middleware';
import { BodyParserUrlencodedMiddleware } from 'src/middleware/body-parser/body-parser-urlencoded.middleware';
import { BodyParserJsonMiddleware } from 'src/middleware/body-parser/body-parser-json.middleware';
import { ResponseBodyMiddleware } from 'src/middleware/response/response.middleware';
import { HelmetMiddleware } from 'src/middleware/helmet/helmet.middleware';
import { RateLimitMiddleware } from 'src/middleware/rate-limit/rate-limit.middleware';
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

@Module({
    controllers: [AppController],
    providers: [AppService],
    imports: [
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
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        //! middleware
        consumer
            .apply(
                ResponseBodyMiddleware,
                HttpLoggerMiddleware,
                BodyParserUrlencodedMiddleware,
                BodyParserJsonMiddleware,
                HelmetMiddleware,
                RateLimitMiddleware
            )
            .forRoutes('*');
    }
}
