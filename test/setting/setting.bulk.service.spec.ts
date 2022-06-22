import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { SettingBulkService } from 'src/setting/service/setting.bulk.service';

describe('SettingBulkService', () => {
    let settingBulkService: SettingBulkService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
        }).compile();

        settingBulkService =
            moduleRef.get<SettingBulkService>(SettingBulkService);
    });

    it('should be defined', () => {
        expect(settingBulkService).toBeDefined();
    });

    describe('deleteMany', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingBulkService, 'deleteMany');

            await settingBulkService.deleteMany({ name: 'test' });
            expect(test).toHaveBeenCalledWith({ name: 'test' });
        });

        it('should be success', async () => {
            const result = await settingBulkService.deleteMany({
                name: 'test',
            });
            jest.spyOn(settingBulkService, 'deleteMany').mockImplementation(
                async () => result
            );

            expect(await settingBulkService.deleteMany({ name: 'test' })).toBe(
                result
            );
        });
    });
});
