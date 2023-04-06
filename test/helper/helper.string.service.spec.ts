import { Test } from '@nestjs/testing';
import { IHelperStringRandomOptions } from 'src/common/helper/interfaces/helper.interface';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';

describe('HelperStringService', () => {
    let service: HelperStringService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [HelperStringService],
        }).compile();

        service = moduleRef.get<HelperStringService>(HelperStringService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
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

    describe('randomReference', () => {
        it('should return a random reference with a timestamp prefix', () => {
            const length = 8;
            const prefix = 'order';
            const reference = service.randomReference(length, prefix);
            const regex = new RegExp(`^${prefix}-\\d{13}\\w{${length}}$`);
            expect(regex.test(reference)).toBe(true);
        });

        it('should return a random reference with only a timestamp', () => {
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
                prefix: 'AB',
            };
            const randomString = service.random(length, options);
            const regex = new RegExp(`^AB[A-Z]{6}$`);

            expect(regex.test(randomString)).toBe(true);
        });
    });

    describe('censor', () => {
        it('should not censor strings less than 4 characters in length', () => {
            const value = 'her';
            const censoredValue = service.censor(value);
            expect(censoredValue).toBe('her');
        });

        it('should censor 0.7 string length from start ', () => {
            const value = 'censor me';
            const censoredValue = service.censor(value);
            expect(censoredValue).toBe('******me');
        });

        it('should censor only 7 characters from 10 length strings', () => {
            const value = 'censor me gogo';
            const censoredValue = service.censor(value);
            expect(censoredValue).toBe('*********ogo');
        });

        it('should censor only the last 10 characters for long strings', () => {
            const value = 'censor me long length';
            const censoredValue = service.censor(value);
            expect(censoredValue).toBe('**********ength');
        });
    });

    describe('checkPasswordWeak', () => {
        it('should return true if the password is weak', () => {
            const password = 'weakPassword';
            expect(service.checkPasswordWeak(password)).toBe(true);
        });

        it('should return false if the password is not weak pattern', () => {
            const password = 'strongpassword1';
            expect(service.checkPasswordWeak(password)).toBe(false);
        });
    });

    describe('checkPasswordMedium', () => {
        it('should return true if the password is medium strength', () => {
            const password = 'MediumPassword1';
            expect(service.checkPasswordMedium(password)).toBe(true);
        });

        it('should return false if the password is not medium strength pattern', () => {
            const password = 'STRONGPassword';
            expect(service.checkPasswordMedium(password)).toBe(false);
        });
    });

    describe('checkPasswordStrong', () => {
        it('should return true if the password is strong', () => {
            const password = 'StrongPassword1!';
            expect(service.checkPasswordStrong(password)).toBe(true);
        });

        it('should return false if the password is not strong pattern', () => {
            const password = 'weakpassword';
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
});
