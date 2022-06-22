import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { DatabaseOptionsService } from 'src/database/service/database.options.service';

describe('DatabaseOptionsService', () => {
    let databaseOptionsService: DatabaseOptionsService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
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
    });
});
