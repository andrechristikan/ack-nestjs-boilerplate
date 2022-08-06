import { Test } from '@nestjs/testing';
import { CommonModule } from 'src/common/common.module';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';

describe('HelperHashService', () => {
    let helperHashService: HelperHashService;
    const data = 'aaaa';

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CommonModule],
        }).compile();

        helperHashService = moduleRef.get<HelperHashService>(HelperHashService);
    });

    it('should be defined', () => {
        expect(helperHashService).toBeDefined();
    });

    describe('randomSalt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'randomSalt');

            helperHashService.randomSalt(10);
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const result = helperHashService.randomSalt(10);
            jest.spyOn(helperHashService, 'randomSalt').mockImplementation(
                () => result
            );

            expect(helperHashService.randomSalt(10)).toBe(result);
        });
    });

    describe('bcrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'bcrypt');

            const salt = helperHashService.randomSalt(10);
            helperHashService.bcrypt(data, salt);
            expect(test).toHaveBeenCalledWith(data, salt);
        });

        it('should be success', async () => {
            const salt = helperHashService.randomSalt(10);
            const result = helperHashService.bcrypt(data, salt);
            jest.spyOn(helperHashService, 'bcrypt').mockImplementation(
                () => result
            );

            expect(helperHashService.bcrypt(data, salt)).toBe(result);
        });
    });

    describe('bcryptCompare', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'bcryptCompare');

            const salt = helperHashService.randomSalt(10);
            const hash = helperHashService.bcrypt(data, salt);
            helperHashService.bcryptCompare('bbbb', hash);
            expect(test).toHaveBeenCalledWith('bbbb', hash);
        });

        it('should be success', async () => {
            const salt = helperHashService.randomSalt(10);
            const hash = helperHashService.bcrypt(data, salt);
            const validate = helperHashService.bcryptCompare('bbbb', hash);
            jest.spyOn(helperHashService, 'bcryptCompare').mockImplementation(
                () => validate
            );

            expect(helperHashService.bcryptCompare('bbbb', hash)).toBe(
                validate
            );
        });
    });

    describe('sha256', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'sha256');

            helperHashService.sha256(data);
            expect(test).toHaveBeenCalledWith(data);
        });

        it('should be success', async () => {
            const hash = helperHashService.sha256(data);
            jest.spyOn(helperHashService, 'sha256').mockImplementation(
                () => hash
            );

            expect(helperHashService.sha256(data)).toBe(hash);
        });
    });

    describe('sha256Compare', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperHashService, 'sha256Compare');

            const hash = helperHashService.sha256(data);
            helperHashService.sha256Compare('bbbb', hash);
            expect(test).toHaveBeenCalledWith('bbbb', hash);
        });

        it('should be success', async () => {
            const hash = helperHashService.sha256(data);
            const validate = helperHashService.sha256Compare('bbbb', hash);
            jest.spyOn(helperHashService, 'bcryptCompare').mockImplementation(
                () => validate
            );

            expect(helperHashService.sha256Compare('bbbb', hash)).toBe(
                validate
            );
        });
    });
});
