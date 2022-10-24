import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { HelperModule } from 'src/common/helper/helper.module';
import configs from 'src/configs';

describe('DatabaseOptionsService', () => {
    let databaseOptionsService: DatabaseOptionsService;

    beforeEach(async () => {
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

    describe('createMongooseOptions', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                databaseOptionsService,
                'createMongooseOptions'
            );

            databaseOptionsService.createMongooseOptions();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const options = databaseOptionsService.createMongooseOptions();
            jest.spyOn(
                databaseOptionsService,
                'createMongooseOptions'
            ).mockImplementation(() => options);

            expect(databaseOptionsService.createMongooseOptions()).toBe(
                options
            );
        });

        it('should be success', async () => {
            const options = databaseOptionsService.createMongooseOptions();
            jest.spyOn(
                databaseOptionsService,
                'createMongooseOptions'
            ).mockImplementation(() => options);

            expect(databaseOptionsService.createMongooseOptions()).toBe(
                options
            );
        });
    });

    describe('createTypeOrmOptions', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                databaseOptionsService,
                'createTypeOrmOptions'
            );

            databaseOptionsService.createTypeOrmOptions();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const options = databaseOptionsService.createTypeOrmOptions();
            jest.spyOn(
                databaseOptionsService,
                'createTypeOrmOptions'
            ).mockImplementation(() => options);

            expect(databaseOptionsService.createTypeOrmOptions()).toBe(options);
        });
    });
});
