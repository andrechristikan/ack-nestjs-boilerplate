import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('AuthUtil', () => {
    let util: AuthUtil;
    let helperStringService: HelperStringService;
    let databaseUtil: DatabaseUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'auth.jwt.jtiLength': 40,
                    }),
                },
            ],
        }).compile();
        util = module.get(AuthUtil);
        helperStringService = module.get(HelperStringService);
        databaseUtil = module.get(DatabaseUtil);
    });

    describe('generateJti', () => {
        it('generates a random jti of the configured length', () => {
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('random-jti-value');

            const result = util.generateJti();

            expect(result).toBe('random-jti-value');
            expect(random).toHaveBeenCalledWith(40);
        });

        it('returns a jti of the configured length drawn from the real helper', () => {
            const result = util.generateJti();

            expect(result).toHaveLength(40);
        });
    });

    describe('createLoginIdentifiers', () => {
        it('mints a session id and a jti', () => {
            const createId = vi
                .spyOn(databaseUtil, 'createId')
                .mockReturnValue('session-1');
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('jti-value');

            const result = util.createLoginIdentifiers();

            expect(result).toEqual({
                sessionId: 'session-1',
                jti: 'jti-value',
            });
            expect(createId).toHaveBeenCalledTimes(1);
            expect(random).toHaveBeenCalledWith(40);
        });
    });
});
