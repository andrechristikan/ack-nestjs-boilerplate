import { MongooseModuleOptions } from '@nestjs/mongoose';

export interface IDatabaseOptionService {
    createOptions(): MongooseModuleOptions;
}
