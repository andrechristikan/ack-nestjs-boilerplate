import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';

describe('ApiKeyCredentialUtil', () => {
    const configGet = vi.fn<(key: string) => EnumAppEnvironment | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();

    let util: ApiKeyCredentialUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue(EnumAppEnvironment.local);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyCredentialUtil,
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();

        util = module.get(ApiKeyCredentialUtil);
    });

    describe('createKey', () => {
        it('prefixes the given key with the current environment without drawing a random value', () => {
            const result = util.createKey('given-key');

            expect(result).toBe('local_given-key');
            expect(helperStringService.random).not.toHaveBeenCalled();
        });

        it('prefixes a random value with the current environment when no key is given', () => {
            helperStringService.random.mockReturnValue('random-key');

            const result = util.createKey();

            expect(result).toBe('local_random-key');
            expect(helperStringService.random).toHaveBeenCalledWith(25);
        });
    });

    describe('createHash', () => {
        it('hashes the key and secret joined by a colon', () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-value');

            const result = util.createHash('key-1', 'secret-1');

            expect(result).toBe('hashed-value');
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'key-1:secret-1'
            );
        });
    });

    describe('createSecret', () => {
        it('returns a random 50-character secret', () => {
            helperStringService.random.mockReturnValue('random-secret');

            const result = util.createSecret();

            expect(result).toBe('random-secret');
            expect(helperStringService.random).toHaveBeenCalledWith(50);
        });
    });

    describe('generateCredential', () => {
        it('generates a key, secret, and hash when no key is given', () => {
            helperStringService.random
                .mockReturnValueOnce('random-key')
                .mockReturnValueOnce('random-secret');
            helperHashService.sha256Hash.mockReturnValue('hashed-value');

            const result = util.generateCredential();

            expect(result).toEqual({
                key: 'local_random-key',
                secret: 'random-secret',
                hash: 'hashed-value',
            });
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'local_random-key:random-secret'
            );
        });

        it('uses the given key when one is passed', () => {
            helperStringService.random.mockReturnValue('random-secret');
            helperHashService.sha256Hash.mockReturnValue('hashed-value');

            const result = util.generateCredential('given-key');

            expect(result).toEqual({
                key: 'given-key',
                secret: 'random-secret',
                hash: 'hashed-value',
            });
        });
    });

    describe('validateCredential', () => {
        it('returns true when the re-derived hash matches the stored hash', () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-value');
            helperHashService.sha256Compare.mockReturnValue(true);

            const result = util.validateCredential('key-1', 'secret-1', {
                hash: 'hashed-value',
            });

            expect(result).toBe(true);
            expect(helperHashService.sha256Compare).toHaveBeenCalledWith(
                'hashed-value',
                'hashed-value'
            );
        });

        it('returns false when the re-derived hash does not match the stored hash', () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-value');
            helperHashService.sha256Compare.mockReturnValue(false);

            const result = util.validateCredential('key-1', 'secret-1', {
                hash: 'other-hash',
            });

            expect(result).toBe(false);
        });
    });
});
