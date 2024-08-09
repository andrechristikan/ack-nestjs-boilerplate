import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseModule } from 'src/common/database/database.module';
import { DatabaseService } from 'src/common/database/services/database.service';
import { MessageModule } from 'src/common/message/message.module';
import { HelperModule } from 'src/common/helper/helper.module';
import { RequestModule } from 'src/common/request/request.module';
import { PolicyModule } from 'src/modules/policy/policy.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import configs from 'src/configs';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { PaginationModule } from 'src/common/pagination/pagination.module';
import { FileModule } from 'src/common/file/file.module';

@Module({
    controllers: [],
    providers: [],
    imports: [
        // Config
        ConfigModule.forRoot({
            load: configs,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env'],
            expandVariables: false,
        }),
        MongooseModule.forRootAsync({
            connectionName: DATABASE_CONNECTION_NAME,
            imports: [DatabaseModule],
            inject: [DatabaseService],
            useFactory: (databaseService: DatabaseService) =>
                databaseService.createOptions(),
        }),
        MessageModule.forRoot(),
        HelperModule.forRoot(),
        RequestModule.forRoot(),
        PolicyModule.forRoot(),
        AuthModule.forRoot(),
        ApiKeyModule.forRoot(),
        PaginationModule.forRoot(),
        FileModule.forRoot(),
    ],
})
export class CommonModule {}
