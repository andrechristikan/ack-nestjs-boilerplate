import { Test } from '@nestjs/testing';
import { BaseModule } from 'src/core/core.module';
import { DatabaseService } from 'src/database/service/database.service';

describe('DatabaseService', () => {
    let databaseService: DatabaseService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BaseModule],
        }).compile();

        databaseService = moduleRef.get<DatabaseService>(DatabaseService);
    });

    it('should be defined', () => {
        expect(databaseService).toBeDefined();
    });

    describe('createMongooseOptions', () => {
        it('should be called', async () => {
            const test = jest.spyOn(databaseService, 'createMongooseOptions');

            databaseService.createMongooseOptions();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const options = databaseService.createMongooseOptions();
            jest.spyOn(
                databaseService,
                'createMongooseOptions'
            ).mockImplementation(() => options);

            expect(databaseService.createMongooseOptions()).toBe(options);
        });
    });
});
