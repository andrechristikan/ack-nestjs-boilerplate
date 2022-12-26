import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import configs from 'src/configs';

describe('HelperHashService', () => {
    let helperHashService: HelperHashService;
    const data = 'aaaa';

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
            ],
        }).compile();

        helperHashService = moduleRef.get<HelperHashService>(HelperHashService);
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(helperHashService).toBeDefined();
    });

    describe('randomSalt', () => {
        it('should be success', async () => {
            const result: string = helperHashService.randomSalt(10);

            jest.spyOn(helperHashService, 'randomSalt').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('bcrypt', () => {
        it('should be success', async () => {
            const salt = helperHashService.randomSalt(10);
            const result: string = helperHashService.bcrypt(data, salt);

            jest.spyOn(helperHashService, 'bcrypt').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.startsWith(salt)).toBe(true);
        });
    });

    describe('bcryptCompare', () => {
        it('should be success', async () => {
            const salt = helperHashService.randomSalt(10);
            const hash = helperHashService.bcrypt(data, salt);
            const result: boolean = helperHashService.bcryptCompare(data, hash);

            jest.spyOn(helperHashService, 'bcryptCompare').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be failed', async () => {
            const salt = helperHashService.randomSalt(10);
            const hash = helperHashService.bcrypt(data, salt);
            const result: boolean = helperHashService.bcryptCompare(
                'bbbb',
                hash
            );

            jest.spyOn(helperHashService, 'bcryptCompare').mockReturnValueOnce(
                result
            );

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });
    });

    describe('sha256', () => {
        it('should be success', async () => {
            const result: string = helperHashService.sha256(data);

            jest.spyOn(helperHashService, 'sha256').mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('sha256Compare', () => {
        it('should be success', async () => {
            const hash = helperHashService.sha256(data);
            const result: boolean = helperHashService.sha256Compare(hash, hash);

            jest.spyOn(helperHashService, 'bcryptCompare').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be failed', async () => {
            const hash = helperHashService.sha256(data);
            const result: boolean = helperHashService.sha256Compare(
                'bbbb',
                hash
            );

            jest.spyOn(helperHashService, 'bcryptCompare').mockReturnValueOnce(
                result
            );

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });
    });
});
