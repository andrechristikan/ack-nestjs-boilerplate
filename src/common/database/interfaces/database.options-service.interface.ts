import { MongooseModuleOptions } from '@nestjs/mongoose';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface IDatabaseOptionsService {
    createMongooseOptions(): MongooseModuleOptions;

    createTypeOrmOptions(): TypeOrmModuleOptions;
}
