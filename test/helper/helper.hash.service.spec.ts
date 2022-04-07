import { Test } from '@nestjs/testing';
import { BaseModule } from 'src/core/core.module';
import { HelperHashService } from 'src/utils/helper/service/helper.hash.service';

describe('HelperHashService', () => {
    let helperHashService: HelperHashService;
    const data = 'aaaa';

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BaseModule],
        }).compile();

        helperHashService = moduleRef.get<HelperHashService>(HelperHashService);
    });

    it('should be defined', () => {
        expect(helperHashService).toBeDefined();
    });

    describe('randomSalt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'randomSalt');

            await helperHashService.randomSalt();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const result = await helperHashService.randomSalt();
            jest.spyOn(helperHashService, 'randomSalt').mockImplementation(
                async () => result
            );

            expect(await helperHashService.randomSalt()).toBe(result);
        });
    });

    describe('bcrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'bcrypt');

            const salt = await helperHashService.randomSalt();
            await helperHashService.bcrypt(data, salt);
            expect(test).toHaveBeenCalledWith(data, salt);
        });

        it('should be success', async () => {
            const salt = await helperHashService.randomSalt();
            const result = await helperHashService.bcrypt(data, salt);
            jest.spyOn(helperHashService, 'bcrypt').mockImplementation(
                async () => result
            );

            expect(await helperHashService.bcrypt(data, salt)).toBe(result);
        });
    });

    describe('bcryptCompare', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'bcryptCompare');

            const salt = await helperHashService.randomSalt();
            const hash = await helperHashService.bcrypt(data, salt);
            await helperHashService.bcryptCompare('bbbb', hash);
            expect(test).toHaveBeenCalledWith('bbbb', hash);
        });

        it('should be success', async () => {
            const salt = await helperHashService.randomSalt();
            const hash = await helperHashService.bcrypt(data, salt);
            const validate = await helperHashService.bcryptCompare(
                'bbbb',
                hash
            );
            jest.spyOn(helperHashService, 'bcryptCompare').mockImplementation(
                async () => validate
            );

            expect(await helperHashService.bcryptCompare('bbbb', hash)).toBe(
                validate
            );
        });
    });

    describe('sha256', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'sha256');

            await helperHashService.sha256(data);
            expect(test).toHaveBeenCalledWith(data);
        });

        it('should be success', async () => {
            const hash = await helperHashService.sha256(data);
            jest.spyOn(helperHashService, 'sha256').mockImplementation(
                async () => hash
            );

            expect(await helperHashService.sha256(data)).toBe(hash);
        });
    });

    describe('sha256Compare', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'sha256Compare');

            const hash = await helperHashService.sha256(data);
            await helperHashService.sha256Compare('bbbb', hash);
            expect(test).toHaveBeenCalledWith('bbbb', hash);
        });

        it('should be success', async () => {
            const hash = await helperHashService.sha256(data);
            const validate = await helperHashService.sha256Compare(
                'bbbb',
                hash
            );
            jest.spyOn(helperHashService, 'bcryptCompare').mockImplementation(
                async () => validate
            );

            expect(await helperHashService.sha256Compare('bbbb', hash)).toBe(
                validate
            );
        });
    });
});
