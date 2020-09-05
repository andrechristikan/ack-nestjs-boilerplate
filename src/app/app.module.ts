import { Module } from '@nestjs/common';
import { AppController } from 'app/app.controller';
import { AppService } from 'app/app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from 'database/database.service';
import { DatabaseModule } from 'database/database.module';
import { UserModule } from 'user/user.module';

@Module({
    controllers: [AppController],
    providers: [AppService],
    imports: [
        MongooseModule.forRootAsync({
            imports: [DatabaseModule],
            inject: [DatabaseService],
            useFactory: async (databaseService: DatabaseService) =>
                databaseService.createMongooseOptions(),
        }),
        UserModule,
    ],
})
export class AppModule {}
