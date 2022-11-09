import { MongooseModuleOptions } from '@nestjs/mongoose';

export interface IDatabaseOptionsService {
    createOptions(): MongooseModuleOptions;
}
