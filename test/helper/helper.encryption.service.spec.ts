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

            await helperEncryptionService.base64Encrypt(data);
            expect(test).toHaveBeenCalledWith(data);
        });

        it('should be success', async () => {
            const result = await helperEncryptionService.base64Encrypt(data);
            jest.spyOn(
                helperEncryptionService,
                'base64Encrypt'
            ).mockImplementation(async () => result);

            expect(await helperEncryptionService.base64Encrypt(data)).toBe(
                result
            );
        });
    });

    describe('base64Decrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'base64Decrypt');

            const result = await helperEncryptionService.base64Encrypt(data);
            helperEncryptionService.base64Decrypt(result);
            expect(test).toHaveBeenCalledWith(result);
        });

        it('should be success', async () => {
            const result = await helperEncryptionService.base64Encrypt(data);
            jest.spyOn(
                helperEncryptionService,
                'base64Decrypt'
            ).mockImplementation(async () => data);

            expect(await helperEncryptionService.base64Decrypt(result)).toBe(
                data
            );
        });
    });

    describe('aes256Encrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'aes256Encrypt');

            await helperEncryptionService.aes256Encrypt(
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
            const result = await helperEncryptionService.aes256Encrypt(
                data,
                '1234567',
                '1231231231231231'
            );
            jest.spyOn(
                helperEncryptionService,
                'aes256Encrypt'
            ).mockImplementation(async () => result);

            expect(
                await helperEncryptionService.aes256Encrypt(
                    data,
                    '1234567',
                    '1231231231231231'
                )
            ).toBe(result);
        });

        it('object should be success', async () => {
            const result = await helperEncryptionService.aes256Encrypt(
                dataObject,
                '1234567',
                '1231231231231231'
            );
            jest.spyOn(
                helperEncryptionService,
                'aes256Encrypt'
            ).mockImplementation(async () => result);

            expect(
                await helperEncryptionService.aes256Encrypt(
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

            const result = await helperEncryptionService.aes256Encrypt(
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
            const result = await helperEncryptionService.aes256Encrypt(
                data,
                '1234567',
                '1231231231231231'
            );
            jest.spyOn(
                helperEncryptionService,
                'aes256Decrypt'
            ).mockImplementation(async () => data);

            expect(
                await helperEncryptionService.aes256Decrypt(
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

            await helperEncryptionService.jwtEncrypt({ data });
            expect(test).toHaveBeenCalledWith({ data });
        });

        it('should be success', async () => {
            const result = await helperEncryptionService.jwtEncrypt({ data });
            jest.spyOn(
                helperEncryptionService,
                'jwtEncrypt'
            ).mockImplementation(async () => result);

            expect(await helperEncryptionService.jwtEncrypt({ data })).toBe(
                result
            );
        });
    });

    describe('jwtDecrypt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'jwtDecrypt');

            const result = await helperEncryptionService.jwtEncrypt({ data });
            helperEncryptionService.jwtDecrypt(result);
            expect(test).toHaveBeenCalledWith(result);
        });

        it('should be success', async () => {
            const result = await helperEncryptionService.jwtEncrypt({ data });
            const decrypt = await helperEncryptionService.jwtDecrypt(result);
            jest.spyOn(
                helperEncryptionService,
                'jwtDecrypt'
            ).mockImplementation(async () => decrypt);

            expect(await helperEncryptionService.jwtDecrypt(result)).toBe(
                decrypt
            );
        });
    });

    describe('jwtVerify', () => {
        it('should be called', async () => {
            const test = jest.spyOn(helperEncryptionService, 'jwtVerify');

            const result = await helperEncryptionService.jwtEncrypt({ data });
            helperEncryptionService.jwtVerify(result);
            expect(test).toHaveBeenCalledWith(result);
        });

        it('should be success', async () => {
            const result = await helperEncryptionService.jwtEncrypt({ data });
            const verify = await helperEncryptionService.jwtVerify(result);
            jest.spyOn(helperEncryptionService, 'jwtVerify').mockImplementation(
                async () => verify
            );

            expect(await helperEncryptionService.jwtVerify(result)).toBe(
                verify
            );
        });

        it('should be failed', async () => {
            const result = await helperEncryptionService.jwtEncrypt(
                { data },
                { secretKey: '123123123' }
            );
            const verify = await helperEncryptionService.jwtVerify(result);
            jest.spyOn(helperEncryptionService, 'jwtVerify').mockImplementation(
                async () => verify
            );

            expect(await helperEncryptionService.jwtVerify(result)).toBe(
                verify
            );
        });
    });
});
