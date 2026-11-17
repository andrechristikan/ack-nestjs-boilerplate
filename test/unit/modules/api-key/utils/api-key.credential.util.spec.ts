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
    const configGet =
        vi.fn<(key: string) => EnumAppEnvironment | number | undefined>();
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
        configGet.mockImplementation(key =>
            key === 'auth.xApiKey.keyLength' ? 30 : EnumAppEnvironment.local
        );

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

        it('prefixes a random value of the configured key length with the current environment when the key is null', () => {
            helperStringService.random.mockReturnValue('random-key');

            const result = util.createKey(null);

            expect(result).toBe('local_random-key');
            expect(helperStringService.random).toHaveBeenCalledWith(30);
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
});
