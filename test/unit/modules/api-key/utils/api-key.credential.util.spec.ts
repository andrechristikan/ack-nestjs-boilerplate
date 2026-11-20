import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ApiKeyCredentialUtil } from '@modules/api-key/utils/api-key.credential.util';

describe('ApiKeyCredentialUtil', () => {
    let util: ApiKeyCredentialUtil;
    let helperStringService: HelperStringService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyCredentialUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'app.env': 'local',
                        'auth.xApiKey.keyLength': 30,
                    }),
                },
            ],
        }).compile();

        helperStringService = module.get(HelperStringService);

        util = module.get(ApiKeyCredentialUtil);
    });

    describe('createKey', () => {
        it('prefixes the given key with the current environment without drawing a random value', () => {
            const random = vi.spyOn(helperStringService, 'random');

            const result = util.createKey('given-key');

            expect(result).toBe('local_given-key');
            expect(random).not.toHaveBeenCalled();
        });

        it('prefixes a random value of the configured key length with the current environment when the key is null', () => {
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('random-key');

            const result = util.createKey(null);

            expect(result).toBe('local_random-key');
            expect(random).toHaveBeenCalledWith(30);
        });
    });

    describe('createHash', () => {
        it('hashes the key and secret joined by a colon', () => {
            const result = util.createHash('key-1', 'secret-1');

            expect(result).toBe(
                'b18a276615212509238d7857f88d060a8299b2e998c2bcb88d6b284143cccc6c'
            );
        });
    });
});
