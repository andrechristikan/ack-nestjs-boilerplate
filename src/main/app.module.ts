import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService, DatabaseModule } from 'database';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    MongooseModule.forRootAsync({
      imports: [DatabaseModule],
      useFactory: async (databaseService: DatabaseService) =>
        databaseService.createMongooseOptions(),
      inject: [DatabaseService],
    }),
  ],
})
export class AppModule {}
