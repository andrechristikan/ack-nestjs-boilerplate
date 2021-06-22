import { Module } from '@nestjs/common';
import { AppController } from 'src/app/app.controller';
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
import { HashModule } from 'src/hash/hash.module';
import { PaginationModule } from 'src/pagination/pagination.module';
import { MiddlewareModule } from 'src/middleware/middleware.module';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { SeedsModule } from 'src/database/seeds/seeds.module';
import Configs from 'src/config/index';

@Module({
    controllers: [AppController],
    providers: [],
    imports: [
        // main module
        MiddlewareModule,
        ConfigModule.forRoot({
            load: Configs,
            ignoreEnvFile: false,
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
            useFactory: (databaseService: DatabaseService) =>
                databaseService.createMongooseOptions()
        }),
        MessageModule,
        LoggerModule,
        ResponseModule,
        PaginationModule,
        HashModule,

        // seeder module
        SeedsModule,

        // other module
        EncryptionModule,
        AuthModule,
        UserModule
    ]
})
export class AppModule {}
