import { MongooseModuleOptions } from '@nestjs/mongoose';

export interface IDatabaseOptionsService {
    createMongoOptions(): MongooseModuleOptions;
}
