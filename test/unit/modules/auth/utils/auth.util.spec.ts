import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';

describe('AuthUtil', () => {
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const configValues: Record<string, number> = {
        'auth.jwt.jtiLength': 40,
    };
    let util: AuthUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation(key => configValues[key]);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthUtil,
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        util = module.get(AuthUtil);
    });

    describe('generateJti', () => {
        it('generates a random jti of the configured length', () => {
            helperStringService.random.mockReturnValue('random-jti-value');

            const result = util.generateJti();

            expect(result).toBe('random-jti-value');
            expect(helperStringService.random).toHaveBeenCalledWith(40);
        });
    });

    describe('createLoginIdentifiers', () => {
        it('mints a session id and a jti', () => {
            databaseUtil.createId.mockReturnValue('session-1');
            helperStringService.random.mockReturnValue('jti-value');

            const result = util.createLoginIdentifiers();

            expect(result).toEqual({
                sessionId: 'session-1',
                jti: 'jti-value',
            });
            expect(databaseUtil.createId).toHaveBeenCalledTimes(1);
            expect(helperStringService.random).toHaveBeenCalledWith(40);
        });
    });
});
