import { ConfigModule } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { HelperModule } from 'src/common/helper/helper.module';
import configs from 'src/configs';

describe('DatabaseOptionsService', () => {
    let databaseOptionsService: DatabaseOptionsService;

    beforeEach(async () => {
        process.env.APP_ENV = 'development';
        process.env.DATABASE_USER = 'AckUser';
        process.env.DATABASE_PASSWORD = 'AckUserTestPassword';
        process.env.DATABASE_DEBUG = 'true';
        process.env.DATABASE_OPTIONS =
            'replicaSet=rs0&retryWrites=true&w=majority';

        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                DatabaseOptionsModule,
            ],
        }).compile();

        databaseOptionsService = moduleRef.get<DatabaseOptionsService>(
            DatabaseOptionsService
        );
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(databaseOptionsService).toBeDefined();
    });

    describe('createOptions development', () => {
        beforeEach(async () => {
            process.env.APP_ENV = 'development';
            process.env.DATABASE_USER = 'AckUser';
            process.env.DATABASE_PASSWORD = 'AckUserTestPassword';
            process.env.DATABASE_DEBUG = 'true';
            process.env.DATABASE_OPTIONS =
                'replicaSet=rs0&retryWrites=true&w=majority';

            await Test.createTestingModule({
                imports: [
                    ConfigModule.forRoot({
                        load: configs,
                        isGlobal: true,
                        cache: true,
                        envFilePath: ['.env'],
                        expandVariables: true,
                    }),
                    HelperModule,
                    DatabaseOptionsModule,
                ],
            }).compile();
        });

        it('should be return mongoose options', async () => {
            const result: MongooseModuleOptions =
                databaseOptionsService.createOptions();

            jest.spyOn(
                databaseOptionsService,
                'createOptions'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
            expect(result).toBeTruthy();
        });
    });

    describe('createOptions production', () => {
        beforeEach(async () => {
            process.env.APP_ENV = 'production';
            process.env.DATABASE_OPTIONS = '';

            await Test.createTestingModule({
                imports: [
                    ConfigModule.forRoot({
                        load: configs,
                        isGlobal: true,
                        cache: true,
                        envFilePath: ['.env'],
                        expandVariables: true,
                    }),
                    HelperModule,
                    DatabaseOptionsModule,
                ],
            }).compile();
        });

        it('should be return mongoose options with production env', async () => {
            process.env.APP_ENV = 'production';
            process.env.DATABASE_OPTIONS = '';

            const result: MongooseModuleOptions =
                databaseOptionsService.createOptions();

            jest.spyOn(
                databaseOptionsService,
                'createOptions'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
            expect(result).toBeTruthy();
            expect(result).toBeTruthy();
        });
    });
});
