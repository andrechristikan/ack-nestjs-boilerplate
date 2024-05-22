import { MongooseModuleOptions } from '@nestjs/mongoose';

export interface IDatabaseService {
    createOptions(): MongooseModuleOptions;
}
