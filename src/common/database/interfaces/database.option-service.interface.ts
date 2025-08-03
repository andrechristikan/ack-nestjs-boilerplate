import { MongooseModuleOptions } from '@nestjs/mongoose';

export interface IDatabaseOptionService {
    createOptions(): Promise<MongooseModuleOptions>;
}
