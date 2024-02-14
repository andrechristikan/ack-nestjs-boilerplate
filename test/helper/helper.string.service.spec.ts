import { Test } from '@nestjs/testing';
import { IHelperStringRandomOptions } from 'src/common/helper/interfaces/helper.interface';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';

describe('HelperStringService', () => {
    let service: HelperStringService;

    beforeEach(async () => {
        const moduleRefRef = await Test.createTestingModule({
            providers: [HelperStringService],
        }).compile();

        service = moduleRefRef.get<HelperStringService>(HelperStringService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('randomReference', () => {
        it('should return a random reference', () => {
            const length = 8;
            const reference = service.randomReference(length);
            const regex = new RegExp(`^\\d{13}\\w{${length}}$`);
            expect(regex.test(reference)).toBe(true);
        });
    });

    describe('random', () => {
        it('should return a random string of specified length', () => {
            const length = 8;
            const options: IHelperStringRandomOptions = {};
            const randomString = service.random(length, options);
            expect(randomString.length).toBe(length);
        });

        it('should return a random string with specified options', () => {
            const length = 8;
            const options: IHelperStringRandomOptions = {
                safe: true,
                upperCase: true,
            };
            const randomString = service.random(length, options);
            const regex = new RegExp(`^[A-Z]{8}$`);

            expect(regex.test(randomString)).toBe(true);
        });
    });

    describe('censor', () => {
        it('should not censor strings less than equals 3 characters in length', () => {
            const value = 'her';
            const censoredValue = service.censor(value);
            expect(censoredValue).toBe('**r');
        });

        it('should not censor strings less than equals 10 characters in length', () => {
            const value = 'ensorMe';
            const censoredValue = service.censor(value);
            expect(censoredValue).toBe('*******rMe');
        });

        it('should censor string from start, because string length is less than equals 25', () => {
            const value = 'censorMeGogoNow';
            const censoredValue = service.censor(value);
            expect(censoredValue).toBe('********goNow');
        });

        it('should censor in the middle of string, because string length more than 10', () => {
            const value = 'censorMeGogoNowLongestMoreThan25';
            const censoredValue = service.censor(value);
            expect(censoredValue).toBe('cen**********MoreThan25');
        });
    });

    describe('checkEmail', () => {
        it('should return true for a valid email', () => {
            const email = 'test@example.com';
            expect(service.checkEmail(email)).toBe(true);
        });

        it('should return false for an invalid email', () => {
            const email = 'invalid-email';
            expect(service.checkEmail(email)).toBe(false);
        });
    });

    describe('checkPasswordWeak', () => {
        it('should return true if the password is weak', () => {
            const password = 'weakPassword';
            expect(service.checkPasswordWeak(password)).toBe(true);
        });

        it('should return false if the password is not weak pattern', () => {
            const password = 'weakpassword';
            expect(service.checkPasswordWeak(password)).toBe(false);
        });
    });

    describe('checkPasswordMedium', () => {
        it('should return true if the password is medium strength', () => {
            const password = 'MediumPassword1';
            expect(service.checkPasswordMedium(password)).toBe(true);
        });

        it('should return false if the password is not medium strength pattern', () => {
            const password = 'mediumpassword';
            expect(service.checkPasswordMedium(password)).toBe(false);
        });
    });

    describe('checkPasswordStrong', () => {
        it('should return true if the password is strong', () => {
            const password = 'StrongPassword1!';
            expect(service.checkPasswordStrong(password)).toBe(true);
        });

        it('should return false if the password is not strong pattern', () => {
            const password = 'strongpassword';
            expect(service.checkPasswordStrong(password)).toBe(false);
        });
    });

    describe('checkSafeString', () => {
        it('should return true if the string is safe', () => {
            const text = 'SafeString_123';
            expect(service.checkSafeString(text)).toBe(true);
        });

        it('should return false if the string is not safe', () => {
            const text = 'Unsafe!@#';
            expect(service.checkSafeString(text)).toBe(false);
        });
    });

    describe('formatCurrency', () => {
        it('should return string that formatted as currency', () => {
            const num = 1000;

            expect(service.formatCurrency(num)).toBe('1,000');
        });

        it('should return string that formatted as currency with locale id-ID', () => {
            const num = 1000;

            expect(service.formatCurrency(num, { locale: 'id-ID' })).toBe(
                '1.000'
            );
        });
    });
});
