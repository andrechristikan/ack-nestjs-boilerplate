import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';

describe('HelperEncryptionService', () => {
    let service: HelperEncryptionService;

    const mockJwtService = {
        sign: jest.fn().mockReturnValue('mockedToken'),
        decode: jest.fn().mockReturnValue({ text: 'mockedData' }),
        verify: jest.fn().mockImplementation((token: string) => {
            if (token === 'AValidJwtTokenForTestingPurposes') return true;
            throw Error();
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HelperEncryptionService,
                { provide: JwtService, useValue: mockJwtService },
            ],
        }).compile();

        service = module.get<HelperEncryptionService>(HelperEncryptionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('base64Encrypt', () => {
        it('should return base64 string when given utf8 string', () => {
            expect(service.base64Encrypt('Hello World!')).toBe(
                'SGVsbG8gV29ybGQh'
            );
        });
    });

    describe('base64Decrypt', () => {
        it('should return utf8 string when given base64 string', () => {
            expect(service.base64Decrypt('SGVsbG8gV29ybGQh')).toBe(
                'Hello World!'
            );
        });
    });

    describe('base64Compare', () => {
        it('should return true when given two identical base64 strings', () => {
            expect(
                service.base64Compare('SGVsbG8gV29ybGQh', 'SGVsbG8gV29ybGQh')
            ).toBe(true);
        });

        it('should return false when given two different base64 strings', () => {
            expect(
                service.base64Compare('SGVsbG8gV29ybGQh', 'SGVsbG8gV29ybw==')
            ).toBe(false);
        });
    });

    describe('aes256Encrypt', () => {
        it('should return encrypted string when given valid plaintext, key, and iv', () => {
            const plaintext = 'Hello World!';
            const key = 'AKeyForTestingPurposes';
            const iv = 'AnIvForTestingPurposes';
            const encrypted = service.aes256Encrypt(plaintext, key, iv);

            expect(typeof encrypted).toBe('string');
            expect(encrypted).not.toBe(plaintext);
        });
    });

    describe('aes256Decrypt', () => {
        it('should return plaintext when given valid encrypted string, key, and iv', () => {
            const plaintext = 'Hello World!';
            const key = 'AKeyForTestingPurposes';
            const iv = 'AnIvForTestingPurposes';
            const encrypted = service.aes256Encrypt(plaintext, key, iv);
            const decrypted = service.aes256Decrypt(encrypted, key, iv);

            expect(typeof decrypted).toBe('string');
            expect(decrypted).toBe(plaintext);
        });
    });

    describe('jwtEncrypt', () => {
        it('should return JWT token when given payload and options', () => {
            const payload = { name: 'Jane Doe' };
            const options = {
                secretKey: 'ASecretKeyForTestingPurposes',
                expiredIn: '1 hour',
                audience: 'test_audience',
                issuer: 'test_issuer',
                subject: 'test_subject',
            };
            const token = service.jwtEncrypt(payload, options);

            expect(typeof token).toBe('string');
            expect(token).toBe('mockedToken');
        });
    });

    describe('jwtDecrypt', () => {
        it('should return decoded data when given valid JWT token', () => {
            const token = 'AValidJwtTokenForTestingPurposes';
            const decoded = service.jwtDecrypt(token);

            expect(typeof decoded).toBe('object');
            expect(decoded).toEqual({ text: 'mockedData' });
        });
    });

    describe('jwtVerify', () => {
        it('should return true when given valid JWT token and options', () => {
            const token = 'AValidJwtTokenForTestingPurposes';
            const options = {
                secretKey: 'ASecretKeyForTestingPurposes',
                audience: 'test_audience',
                issuer: 'test_issuer',
                subject: 'test_subject',
            };
            const verified = service.jwtVerify(token, options);

            expect(typeof verified).toBe('boolean');
            expect(verified).toBe(true);
        });

        it('should return false when given invalid JWT token and options', () => {
            const token = 'AnInvalidJwtTokenForTestingPurposes';
            const options = {
                secretKey: 'ASecretKeyForTestingPurposes123',
                audience: 'test_audience',
                issuer: 'test_issuer',
                subject: 'test_subject',
            };
            const verified = service.jwtVerify(token, options);

            expect(typeof verified).toBe('boolean');
            expect(verified).toBe(false);
        });
    });
});
