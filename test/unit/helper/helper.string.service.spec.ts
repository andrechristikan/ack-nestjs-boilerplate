import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import configs from 'src/configs';

describe('HelperStringService', () => {
    let helperStringService: HelperStringService;

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

        helperStringService =
            moduleRef.get<HelperStringService>(HelperStringService);
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(helperStringService).toBeDefined();
    });

    describe('checkEmail', () => {
        it('should be success', async () => {
            const result: boolean =
                helperStringService.checkEmail('111@mail.com');

            jest.spyOn(helperStringService, 'checkEmail').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be failed', async () => {
            const result: boolean = helperStringService.checkEmail('111');

            jest.spyOn(helperStringService, 'checkEmail').mockReturnValueOnce(
                result
            );

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });
    });

    describe('randomReference', () => {
        it('should be success', async () => {
            const result: string = helperStringService.randomReference(10);

            jest.spyOn(
                helperStringService,
                'randomReference'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be success with prefix', async () => {
            const result: string = helperStringService.randomReference(
                10,
                'test'
            );

            jest.spyOn(
                helperStringService,
                'randomReference'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result.startsWith('test')).toBe(true);
        });
    });

    describe('random', () => {
        it('should be success', async () => {
            const result = helperStringService.random(5);

            jest.spyOn(helperStringService, 'random').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('should be success with options prefix', async () => {
            const result = helperStringService.random(5, { prefix: 'aaa' });

            jest.spyOn(helperStringService, 'random').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result.startsWith('aaa')).toBe(true);
        });

        it('should be success with options prefix, safe, and uppercase', async () => {
            const result = helperStringService.random(5, {
                prefix: 'aaa',
                safe: true,
                upperCase: true,
            });

            jest.spyOn(helperStringService, 'random').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
            expect(result.startsWith('AAA')).toBe(true);
        });
    });

    describe('censor', () => {
        it('string length 1 should be success', async () => {
            const result: string = helperStringService.censor('1');

            jest.spyOn(helperStringService, 'censor').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('string length 1 - 4 should be success', async () => {
            const result: string = helperStringService.censor('125');

            jest.spyOn(helperStringService, 'censor').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('string length 4 - 10 should be success', async () => {
            const result: string = helperStringService.censor('123245');

            jest.spyOn(helperStringService, 'censor').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });

        it('string length > 10 should be success', async () => {
            const result: string = helperStringService.censor(
                '12312312312312312312312'
            );

            jest.spyOn(helperStringService, 'censor').mockReturnValueOnce(
                result
            );

            expect(result).toBeTruthy();
        });
    });

    describe('checkPasswordWeak', () => {
        it('should be success', async () => {
            const result: boolean =
                helperStringService.checkPasswordWeak('aaAAbbBBccCC');

            jest.spyOn(
                helperStringService,
                'checkPasswordWeak'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('checkPasswordMedium', () => {
        it('should be success', async () => {
            const result: boolean =
                helperStringService.checkPasswordMedium('aaAA12345');

            jest.spyOn(
                helperStringService,
                'checkPasswordMedium'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('checkPasswordStrong', () => {
        it('should be success', async () => {
            const result: boolean =
                helperStringService.checkPasswordStrong('aaAA12345@!');

            jest.spyOn(
                helperStringService,
                'checkPasswordStrong'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('checkSafeString', () => {
        it('should be success', async () => {
            const result: boolean = helperStringService.checkSafeString('123');

            jest.spyOn(
                helperStringService,
                'checkSafeString'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });
});
