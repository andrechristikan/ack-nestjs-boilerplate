import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseOptionsService } from './services/database.options.service';

@Module({
    providers: [DatabaseOptionsService],
    exports: [DatabaseOptionsService],
    imports: [],
})
export class DatabaseOptionsModule {}

@Module({
    providers: [],
    exports: [],
    imports: [
        MongooseModule.forRootAsync({
            connectionName: DATABASE_CONNECTION_NAME,
            inject: [DatabaseOptionsService],
            imports: [DatabaseOptionsModule],
            useFactory: (databaseOptionsService: DatabaseOptionsService) =>
                databaseOptionsService.createMongooseOptions(),
        }),
    ],
})
export class DatabaseModule {}
