import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthCommonPasswordRepository } from '@modules/auth/repositories/auth.common-password.repository';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('AuthPasswordService', () => {
    const today = new Date('2026-01-01T00:00:00.000Z');
    const authCommonPasswordRepository: MockProxy<AuthCommonPasswordRepository> =
        mock<AuthCommonPasswordRepository>();
    let service: AuthPasswordService;
    let helperHashService: HelperHashService;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(today);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        const configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'auth.password.contextWordMinLength': 4,
            'auth.password.temporaryExpiresInMs': 3600000,
            'auth.password.periodInDays': 90,
            'auth.password.temporaryLength': 14,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthPasswordService,
                ...TestUnitKitProviders,
                {
                    provide: AuthCommonPasswordRepository,
                    useValue: authCommonPasswordRepository,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(AuthPasswordService);
        helperHashService = module.get(HelperHashService);
        authCommonPasswordRepository.existsByValue.mockResolvedValue(false);
    });

    describe('create', () => {
        it('hashes the password with argon2id and answers a null expiry for a regular password', async () => {
            const result = await service.create('secret');

            expect(result).toEqual({
                passwordHash: expect.stringMatching(/^\$argon2id\$/),
                passwordExpired: null,
                passwordCreated: today,
                passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
            });
            await expect(
                helperHashService.argon2Compare('secret', result.passwordHash)
            ).resolves.toBe(true);
        });

        it('sets the temporary expiry ahead of today when temporary is set', async () => {
            const result = await service.create('secret', { temporary: true });

            expect(result.passwordExpired).toEqual(
                new Date('2026-01-01T01:00:00.000Z')
            );
        });
    });

    describe('createRandom', () => {
        it('returns a string of the configured temporary length', () => {
            expect(service.createRandom()).toHaveLength(14);
        });
    });

    describe('assertAllowed', () => {
        it('throws the common exception for a listed password in any letter case', async () => {
            authCommonPasswordRepository.existsByValue.mockImplementation(
                async (value: string) => value === 'password123'
            );

            await expect(
                service.assertAllowed('PASSWORD123', [])
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.passwordCommon,
            });
            expect(
                authCommonPasswordRepository.existsByValue
            ).toHaveBeenCalledWith('password123');
        });

        it.each([
            ['the application name', 'MyApp-Secret-9', 'MyApp'],
            ['the email local part', 'Zz-John-99', 'john.doe'],
            ['the username', 'Zz-Bramble-1', 'bramble_fox'],
            ['the name', 'Xx-SMITH-12', 'Ann Smith'],
        ])(
            'throws the context exception for a password containing %s',
            async (_label, password, contextWord) => {
                await expect(
                    service.assertAllowed(password, [contextWord])
                ).rejects.toMatchObject({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.passwordContextWord,
                });
                expect(
                    authCommonPasswordRepository.existsByValue
                ).not.toHaveBeenCalled();
            }
        );

        it('splits a context string on every non-alphanumeric character', async () => {
            await expect(
                service.assertAllowed('Pre-john-Post-1', ['john.doe'])
            ).rejects.toMatchObject({
                module: 'auth',

                statusCode: EnumAuthStatusCodeError.passwordContextWord,
            });
        });

        it('ignores a context word shorter than the minimum length', async () => {
            await expect(
                service.assertAllowed('Joe-Doe-12345', ['joe', 'doe'])
            ).resolves.toBeUndefined();
        });

        it('resolves an allowed password', async () => {
            await expect(
                service.assertAllowed('correct horse battery', ['myapp'])
            ).resolves.toBeUndefined();
            expect(
                authCommonPasswordRepository.existsByValue
            ).toHaveBeenCalledWith('correct horse battery');
        });
    });
});
