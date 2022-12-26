import { faker } from '@faker-js/faker';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import configs from 'src/configs';

describe('HelperEncryptionService', () => {
    let helperEncryptionService: HelperEncryptionService;
    const audience = 'https://example.com';
    const issuer = 'ack';
    const subject = 'ack';
    const data = 'aaaa';
    const dataObject = { test: 'aaaa' };
    let enBase64: string;
    let enAes256: string;
    let enAes256Object: string;
    let enJwt: string;

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

        helperEncryptionService = moduleRef.get<HelperEncryptionService>(
            HelperEncryptionService
        );

        enBase64 = helperEncryptionService.base64Encrypt(data);
        enAes256 = helperEncryptionService.aes256Encrypt(
            data,
            '1234567',
            '1231231231231231'
        );
        enAes256Object = helperEncryptionService.aes256Encrypt(
            dataObject,
            '1234567',
            '1231231231231231'
        );
        enJwt = helperEncryptionService.jwtEncrypt(
            { data },
            { expiredIn: '1h', secretKey: data, audience, issuer, subject }
        );
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(helperEncryptionService).toBeDefined();
    });

    describe('base64Encrypt', () => {
        it('string must encode to base64 string', async () => {
            const result: string = helperEncryptionService.base64Encrypt(data);

            jest.spyOn(
                helperEncryptionService,
                'base64Encrypt'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('base64Decrypt', () => {
        it('base64 string must decode string', async () => {
            const result: string =
                helperEncryptionService.base64Decrypt(enBase64);

            jest.spyOn(
                helperEncryptionService,
                'base64Decrypt'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('base64Compare', () => {
        it('should be success', async () => {
            const result: boolean = helperEncryptionService.base64Compare(
                enBase64,
                enBase64
            );

            jest.spyOn(
                helperEncryptionService,
                'base64Compare'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be failed', async () => {
            const result: boolean = helperEncryptionService.base64Compare(
                data,
                enBase64
            );

            jest.spyOn(
                helperEncryptionService,
                'base64Compare'
            ).mockReturnValueOnce(result);

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });
    });

    describe('aes256Encrypt', () => {
        it('string must be encode to aes256 string', async () => {
            const result: string = helperEncryptionService.aes256Encrypt(
                data,
                '1234567',
                '1231231231231231'
            );

            jest.spyOn(
                helperEncryptionService,
                'aes256Encrypt'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('object must be encode to aes256 string', async () => {
            const result: string = helperEncryptionService.aes256Encrypt(
                dataObject,
                '1234567',
                '1231231231231231'
            );

            jest.spyOn(
                helperEncryptionService,
                'aes256Encrypt'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('aes256Decrypt', () => {
        it('aes256 string decode to string', async () => {
            const result: string = helperEncryptionService.aes256Decrypt(
                enAes256,
                '1234567',
                '1231231231231231'
            ) as string;

            jest.spyOn(
                helperEncryptionService,
                'aes256Decrypt'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be success object', async () => {
            const result: Record<string, any> =
                helperEncryptionService.aes256Decrypt(
                    enAes256Object,
                    '1234567',
                    '1231231231231231'
                ) as Record<string, any>;

            jest.spyOn(
                helperEncryptionService,
                'aes256Decrypt'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('jwtEncrypt', () => {
        it('should be success to jwt encode string', async () => {
            const result: string = helperEncryptionService.jwtEncrypt(
                { data },
                { expiredIn: '1h', secretKey: data, audience, issuer, subject }
            );

            jest.spyOn(
                helperEncryptionService,
                'jwtEncrypt'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('jwtDecrypt', () => {
        it('jwt encode string decode and give a payload', async () => {
            const result: Record<string, any> =
                helperEncryptionService.jwtDecrypt(enJwt);

            jest.spyOn(
                helperEncryptionService,
                'jwtDecrypt'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });
    });

    describe('jwtVerify', () => {
        it('should be success', async () => {
            const result: boolean = helperEncryptionService.jwtVerify(enJwt, {
                secretKey: data,
                audience,
                issuer,
                subject,
            });

            jest.spyOn(
                helperEncryptionService,
                'jwtVerify'
            ).mockReturnValueOnce(result);

            expect(result).toBeTruthy();
        });

        it('should be failed', async () => {
            const result: boolean = helperEncryptionService.jwtVerify(enJwt, {
                secretKey: faker.random.alpha(5),
                audience,
                issuer,
                subject,
            });

            jest.spyOn(
                helperEncryptionService,
                'jwtVerify'
            ).mockReturnValueOnce(result);

            expect(result).toBeFalsy();
        });
    });
});
