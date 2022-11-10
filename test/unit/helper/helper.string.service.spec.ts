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

    it('should be defined', () => {
        expect(helperStringService).toBeDefined();
    });

    describe('checkEmail', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'checkEmail');

            helperStringService.checkEmail('111');
            expect(test).toHaveBeenCalledWith('111');
        });

        it('should be success', async () => {
            const result = helperStringService.checkEmail('111');
            jest.spyOn(helperStringService, 'checkEmail').mockImplementation(
                () => result
            );

            expect(helperStringService.checkEmail('111')).toBe(result);
        });
    });

    describe('randomReference', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'randomReference');

            helperStringService.randomReference(10);
            expect(test).toHaveBeenCalledWith(10);
        });

        it('should be success', async () => {
            const result = helperStringService.randomReference(10, 'test');
            jest.spyOn(
                helperStringService,
                'randomReference'
            ).mockImplementation(() => result);

            expect(helperStringService.randomReference(10, 'test')).toBe(
                result
            );
        });
    });

    describe('random', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'random');

            helperStringService.random(5);
            expect(test).toHaveBeenCalledWith(5);
        });

        it('should be success', async () => {
            const result = helperStringService.random(5);
            jest.spyOn(helperStringService, 'random').mockImplementation(
                () => result
            );

            expect(helperStringService.random(5)).toBe(result);
        });

        it('should be success with options prefix', async () => {
            const result = helperStringService.random(5, { prefix: 'aaa' });
            jest.spyOn(helperStringService, 'random').mockImplementation(
                () => result
            );

            expect(helperStringService.random(5, { prefix: 'aaa' })).toBe(
                result
            );
        });

        it('should be success with options prefix and safe', async () => {
            const result = helperStringService.random(5, {
                prefix: 'aaa',
                safe: true,
            });
            jest.spyOn(helperStringService, 'random').mockImplementation(
                () => result
            );

            expect(
                helperStringService.random(5, { prefix: 'aaa', safe: true })
            ).toBe(result);
        });
    });

    describe('censor', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'censor');

            helperStringService.censor('12312312');
            expect(test).toHaveBeenCalledWith('12312312');
        });

        it('string length 1 should be success', async () => {
            const result = helperStringService.censor('1');
            jest.spyOn(helperStringService, 'censor').mockImplementation(
                () => result
            );

            expect(helperStringService.censor('1')).toBe(result);
        });

        it('string length 1 - 4 should be success', async () => {
            const result = helperStringService.censor('125');
            jest.spyOn(helperStringService, 'censor').mockImplementation(
                () => result
            );

            expect(helperStringService.censor('125')).toBe(result);
        });

        it('string length 4 - 10 should be success', async () => {
            const result = helperStringService.censor('123245');
            jest.spyOn(helperStringService, 'censor').mockImplementation(
                () => result
            );

            expect(helperStringService.censor('123245')).toBe(result);
        });

        it('string length > 10 should be success', async () => {
            const result = helperStringService.censor(
                '12312312312312312312312'
            );
            jest.spyOn(helperStringService, 'censor').mockImplementation(
                () => result
            );

            expect(helperStringService.censor('12312312312312312312312')).toBe(
                result
            );
        });
    });

    describe('checkPasswordWeak', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'checkPasswordWeak');

            helperStringService.checkPasswordWeak('aaAAbbBBccCC');
            expect(test).toHaveBeenCalledWith('aaAAbbBBccCC');
        });

        it('should be success', async () => {
            const result =
                helperStringService.checkPasswordWeak('aaAAbbBBccCC');
            jest.spyOn(
                helperStringService,
                'checkPasswordWeak'
            ).mockImplementation(() => result);

            expect(helperStringService.checkPasswordWeak('aaAAbbBBccCC')).toBe(
                result
            );
        });
    });

    describe('checkPasswordMedium', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'checkPasswordMedium');

            helperStringService.checkPasswordMedium('aaAA12345');
            expect(test).toHaveBeenCalledWith('aaAA12345');
        });

        it('should be success', async () => {
            const result = helperStringService.checkPasswordMedium('aaAA12345');
            jest.spyOn(
                helperStringService,
                'checkPasswordMedium'
            ).mockImplementation(() => result);

            expect(helperStringService.checkPasswordMedium('aaAA12345')).toBe(
                result
            );
        });
    });

    describe('checkPasswordStrong', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'checkPasswordStrong');

            helperStringService.checkPasswordStrong('aaAA12345@!');
            expect(test).toHaveBeenCalledWith('aaAA12345@!');
        });

        it('should be success', async () => {
            const result =
                helperStringService.checkPasswordStrong('aaAA12345@!');
            jest.spyOn(
                helperStringService,
                'checkPasswordStrong'
            ).mockImplementation(() => result);

            expect(helperStringService.checkPasswordStrong('aaAA12345@!')).toBe(
                result
            );
        });
    });

    describe('checkSafeString', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperStringService, 'checkSafeString');

            helperStringService.checkSafeString('123');
            expect(test).toHaveBeenCalledWith('123');
        });

        it('should be success', async () => {
            const result = helperStringService.checkSafeString('123');
            jest.spyOn(
                helperStringService,
                'checkSafeString'
            ).mockImplementation(() => result);

            expect(helperStringService.checkSafeString('123')).toBe(result);
        });
    });
});
