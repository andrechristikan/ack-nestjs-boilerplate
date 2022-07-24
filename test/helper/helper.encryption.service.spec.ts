import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { HelperEncryptionService } from 'src/utils/helper/service/helper.encryption.service';

describe('HelperEncryptionService', () => {
    let helperEncryptionService: HelperEncryptionService;
    const data = 'aaaa';
    const dataObject = { test: 'aaaa' };

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
        }).compile();

        helperEncryptionService = moduleRef.get<HelperEncryptionService>(
            HelperEncryptionService
        );
    });

    it('should be defined', () => {
        expect(helperEncryptionService).toBeDefined();
    });

    describe('base64Encrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'base64Encrypt');

            helperEncryptionService.base64Encrypt(data);
            expect(test).toHaveBeenCalledWith(data);
        });

        it('should be success', async () => {
            const result = helperEncryptionService.base64Encrypt(data);
            jest.spyOn(
                helperEncryptionService,
                'base64Encrypt'
            ).mockImplementation(() => result);

            expect(helperEncryptionService.base64Encrypt(data)).toBe(result);
        });
    });

    describe('base64Decrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'base64Decrypt');

            const result = helperEncryptionService.base64Encrypt(data);
            helperEncryptionService.base64Decrypt(result);
            expect(test).toHaveBeenCalledWith(result);
        });

        it('should be success', async () => {
            const result = helperEncryptionService.base64Encrypt(data);
            jest.spyOn(
                helperEncryptionService,
                'base64Decrypt'
            ).mockImplementation(() => data);

            expect(helperEncryptionService.base64Decrypt(result)).toBe(data);
        });
    });

    describe('base64Compare', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'base64Compare');

            helperEncryptionService.base64Compare(data, data);
            expect(test).toHaveBeenCalledWith(data, data);
        });

        it('should be success', async () => {
            const result = helperEncryptionService.base64Compare(data, data);
            jest.spyOn(
                helperEncryptionService,
                'base64Compare'
            ).mockImplementation(() => result);

            expect(helperEncryptionService.base64Compare(data, data)).toBe(
                result
            );
        });
    });

    describe('aes256Encrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'aes256Encrypt');

            helperEncryptionService.aes256Encrypt(
                data,
                '1234567',
                '1231231231231231'
            );
            expect(test).toHaveBeenCalledWith(
                data,
                '1234567',
                '1231231231231231'
            );
        });

        it('string should be success', async () => {
            const result = helperEncryptionService.aes256Encrypt(
                data,
                '1234567',
                '1231231231231231'
            );
            jest.spyOn(
                helperEncryptionService,
                'aes256Encrypt'
            ).mockImplementation(() => result);

            expect(
                helperEncryptionService.aes256Encrypt(
                    data,
                    '1234567',
                    '1231231231231231'
                )
            ).toBe(result);
        });

        it('object should be success', async () => {
            const result = helperEncryptionService.aes256Encrypt(
                dataObject,
                '1234567',
                '1231231231231231'
            );
            jest.spyOn(
                helperEncryptionService,
                'aes256Encrypt'
            ).mockImplementation(() => result);

            expect(
                helperEncryptionService.aes256Encrypt(
                    dataObject,
                    '1234567',
                    '1231231231231231'
                )
            ).toBe(result);
        });
    });

    describe('aes256Decrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'aes256Decrypt');

            const result = helperEncryptionService.aes256Encrypt(
                data,
                '1234567',
                '1231231231231231'
            );
            helperEncryptionService.aes256Decrypt(
                result,
                '1234567',
                '1231231231231231'
            );
            expect(test).toHaveBeenCalledWith(
                result,
                '1234567',
                '1231231231231231'
            );
        });

        it('should be success', async () => {
            const result = helperEncryptionService.aes256Encrypt(
                data,
                '1234567',
                '1231231231231231'
            );
            jest.spyOn(
                helperEncryptionService,
                'aes256Decrypt'
            ).mockImplementation(() => data);

            expect(
                helperEncryptionService.aes256Decrypt(
                    result,
                    '1234567',
                    '1231231231231231'
                )
            ).toBe(data);
        });
    });

    describe('jwtEncrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'jwtEncrypt');

            helperEncryptionService.jwtEncrypt(
                { data },
                { expiredIn: '1h', secretKey: data }
            );
            expect(test).toHaveBeenCalledWith(
                { data },
                { expiredIn: '1h', secretKey: data }
            );
        });

        it('should be success', async () => {
            const result = helperEncryptionService.jwtEncrypt(
                { data },
                { expiredIn: '1h', secretKey: data }
            );
            jest.spyOn(
                helperEncryptionService,
                'jwtEncrypt'
            ).mockImplementation(() => result);

            expect(
                helperEncryptionService.jwtEncrypt(
                    { data },
                    { expiredIn: '1h', secretKey: data }
                )
            ).toBe(result);
        });
    });

    describe('jwtDecrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'jwtDecrypt');

            const result = helperEncryptionService.jwtEncrypt(
                { data },
                { expiredIn: '1h', secretKey: data }
            );
            helperEncryptionService.jwtDecrypt(result);
            expect(test).toHaveBeenCalledWith(result);
        });

        it('should be success', async () => {
            const result = helperEncryptionService.jwtEncrypt(
                { data },
                { expiredIn: '1h', secretKey: data }
            );
            const decrypt = helperEncryptionService.jwtDecrypt(result);
            jest.spyOn(
                helperEncryptionService,
                'jwtDecrypt'
            ).mockImplementation(() => decrypt);

            expect(helperEncryptionService.jwtDecrypt(result)).toBe(decrypt);
        });
    });

    describe('jwtVerify', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'jwtVerify');

            const result = helperEncryptionService.jwtEncrypt(
                { data },
                { expiredIn: '1h', secretKey: data }
            );
            helperEncryptionService.jwtVerify(result, { secretKey: data });
            expect(test).toHaveBeenCalledWith(result, { secretKey: data });
        });

        it('should be success', async () => {
            const result = helperEncryptionService.jwtEncrypt(
                { data },
                { expiredIn: '1h', secretKey: data }
            );
            const verify = helperEncryptionService.jwtVerify(result, {
                secretKey: data,
            });
            jest.spyOn(helperEncryptionService, 'jwtVerify').mockImplementation(
                () => verify
            );

            expect(
                helperEncryptionService.jwtVerify(result, { secretKey: data })
            ).toBe(verify);
        });

        it('should be failed', async () => {
            const result = helperEncryptionService.jwtEncrypt(
                { data },
                { expiredIn: '1h', secretKey: data }
            );
            const verify = helperEncryptionService.jwtVerify(result, {
                secretKey: faker.random.alpha(5),
            });
            jest.spyOn(helperEncryptionService, 'jwtVerify').mockImplementation(
                () => verify
            );

            expect(
                helperEncryptionService.jwtVerify(result, {
                    secretKey: faker.random.alpha(5),
                })
            ).toBe(verify);
        });
    });
});
