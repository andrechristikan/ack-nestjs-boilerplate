import { ConfigModule } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseModule } from 'src/common/database/database.module';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { DatabaseService } from 'src/common/database/services/database.service';
import { HelperModule } from 'src/common/helper/helper.module';
import configs from 'src/configs';

describe('DatabaseService', () => {
    let databaseService: DatabaseService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                MongooseModule.forRootAsync({
                    connectionName: DATABASE_CONNECTION_NAME,
                    imports: [DatabaseOptionsModule],
                    inject: [DatabaseOptionsService],
                    useFactory: (
                        databaseOptionsService: DatabaseOptionsService
                    ) => databaseOptionsService.createMongoOptions(),
                }),
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                DatabaseModule,
            ],
        }).compile();

        databaseService = moduleRef.get<DatabaseService>(DatabaseService);
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(databaseService).toBeDefined();
    });

    describe('checkMongoConnection', () => {
        it('should be return mongoose state connection', async () => {
            const result: mongoose.ConnectionStates =
                databaseService.checkMongoConnection();

            jest.spyOn(
                databaseService,
                'checkMongoConnection'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
        });
    });
});
