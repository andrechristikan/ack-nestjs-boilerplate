import { Module } from '@nestjs/common';
import { AppController } from 'app/app.controller';
import { AppService } from 'app/app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'database/database.service';
import { DatabaseModule } from 'database/database.module';
import { UserModule } from 'user/user.module';
import { CountryModule } from 'country/country.module';
import { HelperModule } from 'helper/helper.module';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from 'logger/logger.service';
import { LoggerModule } from 'logger/logger.module';

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
        HelperModule,
    ],
})
export class AppModule {}
