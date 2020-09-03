
import { Injectable } from '@nestjs/common';
import { MongooseOptionsFactory, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '../config/config.service';


@Injectable()
export class DatabaseService implements MongooseOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    let uri = `mongodb://`;
    if(this.config.getEnv('DB_USER') && this.config.getEnv('DB_PASSWORD')){
      uri = `${uri}${this.config.getEnv('DB_USER')}:${this.config.getEnv('DB_PASSWORD')}@`;
    }

    uri = `${uri}${this.config.getEnv('DB_HOST')}/${this.config.getEnv('DB_NAME')}`;
    console.log(`Database running on ${uri}`);

    return {
      uri,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
  }
}
