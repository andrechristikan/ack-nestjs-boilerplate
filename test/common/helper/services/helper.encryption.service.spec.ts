import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { AES } from 'crypto-js';
import { IHelperJwtOptions } from 'src/common/helper/interfaces/helper.interface';
import { ConfigService } from '@nestjs/config';

jest.mock('crypto-js', () => ({
    AES: {
        encrypt: jest.fn(),
        decrypt: jest.fn(),
    },
    enc: {
        Utf8: {
            parse: jest.fn(),
        },
    },
    mode: {
        CBC: {},
    },
    pad: {
        Pkcs7: {},
    },
}));

const mockJwtService = {
    sign: jest.fn(),
    decode: jest.fn(),
    verify: jest.fn(),
};

const mockConfigService = {
    get: jest.fn().mockImplementation(e => {
        switch (e) {
            default:
                return true;
        }
    }),
};

describe('HelperEncryptionService', () => {
    let service: HelperEncryptionService;
    let encrypted: string;
    let decrypted: string;
    let decryptedData: object;
    let jwtService: JwtService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                HelperEncryptionService,
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = moduleRef.get<HelperEncryptionService>(
            HelperEncryptionService
        );
        jwtService = moduleRef.get<JwtService>(JwtService);
        encrypted = 'ZGF0YQ==';
        decrypted = 'data';
        decryptedData = {
            key: 'value',
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('base64Encrypt', () => {
        it('should encrypt data with base64', () => {
            expect(service.base64Encrypt(decrypted)).toEqual(encrypted);
        });
    });

    describe('base64Decrypt', () => {
        it('should decrypt data with base64', () => {
            expect(service.base64Decrypt(encrypted)).toEqual(decrypted);
        });
    });

    describe('base64Compare', () => {
        it('should compare token true', () => {
            expect(service.base64Compare(encrypted, encrypted)).toBe(true);
        });
    });

    describe('aes256Encrypt', () => {
        it('should encrypt data with AES-256', () => {
            const data = { key: 'value' };
            const key = 'encryptionKey';
            const iv = 'initializationVector';
            const result = 'encryptedData';

            (AES.encrypt as jest.Mock).mockReturnValue(result);

            expect(service.aes256Encrypt(data, key, iv)).toEqual(result);
        });
    });

    describe('aes256Decrypt', () => {
        it('should decrypt data with AES-256', () => {
            const key = 'encryptionKey';
            const iv = 'initializationVector';
            const result = {
                key: 'value',
            };

            (AES.decrypt as jest.Mock).mockReturnValue({
                toString: jest
                    .fn()
                    .mockReturnValue(JSON.stringify(decryptedData)),
            });

            expect(service.aes256Decrypt(encrypted, key, iv)).toEqual(result);
        });
    });

    describe('aes256Compare', () => {
        it('should compare AES-256', () => {
            expect(service.aes256Compare(encrypted, encrypted)).toEqual(true);
        });
    });

    describe('jwtEncrypt', () => {
        it('should encrypt data with jwt', () => {
            const payload = {
                key: 'value',
            };
            const opts: IHelperJwtOptions = {
                audience: 'audience',
                expiredIn: 1,
                issuer: 'issuer',
                secretKey: 'secretKey',
                subject: 'subject',
                notBefore: 1,
            };

            (jwtService.sign as jest.Mock).mockReturnValueOnce('jwtSign');

            expect(service.jwtEncrypt(payload, opts)).toEqual('jwtSign');
        });

        it('should encrypt data with jwt without notBefore', () => {
            const payload = {
                key: 'value',
            };
            const opts: IHelperJwtOptions = {
                audience: 'audience',
                expiredIn: 1,
                issuer: 'issuer',
                secretKey: 'secretKey',
                subject: 'subject',
            };

            (jwtService.sign as jest.Mock).mockReturnValueOnce('jwtSign');

            expect(service.jwtEncrypt(payload, opts)).toEqual('jwtSign');
        });
    });

    describe('jwtDecrypt', () => {
        it('should decrypt token with jwt', () => {
            (jwtService.decode as jest.Mock).mockReturnValueOnce('decode');
            expect(service.jwtDecrypt(encrypted)).toEqual('decode');
        });
    });

    describe('jwtVerify', () => {
        it('should verify token with jwt', () => {
            const opts: IHelperJwtOptions = {
                audience: 'audience',
                expiredIn: 1,
                issuer: 'issuer',
                secretKey: 'secretKey',
                subject: 'subject',
                notBefore: 1,
            };
            expect(service.jwtVerify('token', opts)).toEqual(true);
        });

        it('should return false when token verification fails', () => {
            (jwtService.verify as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Invalid token');
            });

            jest.spyOn(service['logger'], 'error').mockImplementation();

            const opts: IHelperJwtOptions = {
                audience: 'audience',
                expiredIn: 1,
                issuer: 'issuer',
                secretKey: 'secretKey',
                subject: 'subject',
                notBefore: 1,
            };
            expect(service.jwtVerify('token', opts)).toEqual(false);
        });
    });
});
