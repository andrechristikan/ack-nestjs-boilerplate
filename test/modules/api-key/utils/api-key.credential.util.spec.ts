import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumAppEnvironment } from '@app/enums/app.enum';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';

describe('ApiKeyCredentialUtil', () => {
    const helperStringService = {
        random: vi.fn<HelperStringService['random']>(),
    } satisfies Pick<HelperStringService, 'random'>;
    const helperHashService = {
        sha256Hash: vi.fn<HelperHashService['sha256Hash']>(),
        sha256Compare: vi.fn<HelperHashService['sha256Compare']>(),
    } satisfies Pick<HelperHashService, 'sha256Hash' | 'sha256Compare'>;

    let service: ApiKeyCredentialUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyCredentialUtil,
                {
                    provide: ConfigService,
                    useValue: new ConfigService({
                        'app.env': EnumAppEnvironment.production,
                    }),
                },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();
        service = moduleRef.get(ApiKeyCredentialUtil);
    });

    it('generates an environment-scoped key, secret, and combined hash', () => {
        helperStringService.random
            .mockReturnValueOnce('random-public-key')
            .mockReturnValueOnce('random-secret');
        helperHashService.sha256Hash.mockReturnValue('stored-hash');

        expect(service.generateCredential()).toEqual({
            key: 'production_random-public-key',
            secret: 'random-secret',
            hash: 'stored-hash',
        });
        expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
            'production_random-public-key:random-secret'
        );
    });

    it('validates a credential using the derived hash', () => {
        helperHashService.sha256Hash.mockReturnValue('derived-hash');
        helperHashService.sha256Compare.mockReturnValue(true);

        expect(
            service.validateCredential('public-key', 'secret', {
                hash: 'stored-hash',
            })
        ).toBe(true);
        expect(helperHashService.sha256Compare).toHaveBeenCalledWith(
            'derived-hash',
            'stored-hash'
        );
    });
});
