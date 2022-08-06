import { Test } from '@nestjs/testing';
import { CommonModule } from 'src/common/common.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';

describe('DatabaseOptionsService', () => {
    let databaseOptionsService: DatabaseOptionsService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CommonModule],
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
});
