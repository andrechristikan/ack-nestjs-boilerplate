import { MongooseModuleOptions } from '@nestjs/mongoose';

export interface IDatabaseOptionsService {
    createMongooseOptions(): MongooseModuleOptions;
}
