import { Test } from '@nestjs/testing';
import {
    IHelperStringCurrencyOptions,
    IHelperStringPasswordOptions,
} from 'src/common/helper/interfaces/helper.interface';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';

describe('HelperStringService', () => {
    let service: HelperStringService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [HelperStringService],
        }).compile();

        service = moduleRef.get<HelperStringService>(HelperStringService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('randomReference', () => {
        it('should return random string', () => {
            const now = new Date();
            const random = 'RANDOM';

            jest.spyOn(global, 'Date').mockImplementation(() => now);
            jest.spyOn(service, 'random').mockReturnValue(random);
            expect(service.randomReference(3)).toEqual(
                `${now.getTime()}${random}`
            );
        });
    });

    describe('random', () => {
        it('should return random alphanumeric', () => {
            expect(service.random(10)).toMatch(/^[a-zA-Z0-9]+$/);
        });
    });

    describe('censor', () => {
        it('should sensor text with length > 10', () => {
            const text = 'abcdefghijkl';
            const result = 'abc**********ijkl';

            expect(service.censor(text)).toEqual(result);
        });

        it('should sensor text with length <= 10', () => {
            const text = 'abcdefghij';
            const result = '*******hij';

            expect(service.censor(text)).toEqual(result);
        });

        it('should sensor text with length <= 3', () => {
            const text = 'abc';
            const result = '**c';

            expect(service.censor(text)).toEqual(result);
        });
    });

    describe('checkEmail', () => {
        it('should return true', () => {
            expect(service.checkEmail('akan@kadence.com')).toBe(true);
        });
    });

    describe('checkPasswordStrength', () => {
        it('should return true', () => {
            expect(service.checkPasswordStrength('P4ssword')).toBe(true);
        });

        it('should return true if length == 4', () => {
            const opts: IHelperStringPasswordOptions = {
                length: 4,
            };
            expect(service.checkPasswordStrength('P4ss', opts)).toBe(true);
        });

        it('should return false', () => {
            expect(service.checkPasswordStrength('password')).toBe(false);
        });
    });

    describe('checkSafeString', () => {
        it('should return true', () => {
            expect(service.checkSafeString('safestring')).toBe(true);
        });

        it('should return false', () => {
            expect(service.checkSafeString('!@#')).toBe(false);
        });
    });

    describe('formatCurrency', () => {
        it('should return formatted currency', () => {
            const number = 1000000;
            const opts: IHelperStringCurrencyOptions = {
                locale: 'id-ID',
            };

            expect(service.formatCurrency(number, opts)).toEqual('1.000.000');
        });
    });
});
