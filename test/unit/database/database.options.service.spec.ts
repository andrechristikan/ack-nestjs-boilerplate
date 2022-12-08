import { ConfigModule } from '@nestjs/config';
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

    it('should be defined', () => {
        expect(databaseOptionsService).toBeDefined();
    });

    describe('createMongoOptions', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                databaseOptionsService,
                'createMongoOptions'
            );

            databaseOptionsService.createMongoOptions();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const options = databaseOptionsService.createMongoOptions();
            jest.spyOn(
                databaseOptionsService,
                'createMongoOptions'
            ).mockImplementation(() => options);

            expect(databaseOptionsService.createMongoOptions()).toBe(options);
        });
    });

    describe('createPostgresOptions', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                databaseOptionsService,
                'createPostgresOptions'
            );

            databaseOptionsService.createPostgresOptions();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const options = databaseOptionsService.createPostgresOptions();
            jest.spyOn(
                databaseOptionsService,
                'createPostgresOptions'
            ).mockImplementation(() => options);

            expect(databaseOptionsService.createPostgresOptions()).toBe(
                options
            );
        });
    });
});

describe('DatabaseOptionsService Production', () => {
    let databaseOptionsService: DatabaseOptionsService;

    beforeEach(async () => {
        process.env.APP_ENV = 'production';
        process.env.DATABASE_OPTIONS = '';

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

    it('should be defined', () => {
        expect(databaseOptionsService).toBeDefined();
    });

    describe('createMongoOptions', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                databaseOptionsService,
                'createMongoOptions'
            );

            databaseOptionsService.createMongoOptions();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const options = databaseOptionsService.createMongoOptions();
            jest.spyOn(
                databaseOptionsService,
                'createMongoOptions'
            ).mockImplementation(() => options);

            expect(databaseOptionsService.createMongoOptions()).toBe(options);
        });
    });

    describe('createPostgresOptions', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                databaseOptionsService,
                'createPostgresOptions'
            );

            databaseOptionsService.createPostgresOptions();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const options = databaseOptionsService.createPostgresOptions();
            jest.spyOn(
                databaseOptionsService,
                'createPostgresOptions'
            ).mockImplementation(() => options);

            expect(databaseOptionsService.createPostgresOptions()).toBe(
                options
            );
        });
    });
});
