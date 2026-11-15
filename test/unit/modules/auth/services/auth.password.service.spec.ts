import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthCommonPasswordRepository } from '@modules/auth/repositories/auth.common-password.repository';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('AuthPasswordService', () => {
    const authCommonPasswordRepository: MockProxy<AuthCommonPasswordRepository> =
        mock<AuthCommonPasswordRepository>();
    let service: AuthPasswordService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const configService = buildConfigService({
            'auth.password.contextWordMinLength': 4,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthPasswordService,
                {
                    provide: AuthCommonPasswordRepository,
                    useValue: authCommonPasswordRepository,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(AuthPasswordService);
        authCommonPasswordRepository.existsByValue.mockResolvedValue(false);
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
                statusCodeKey: 'passwordCommon',
                messagePath: 'auth.error.passwordCommon',
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
                    statusCodeKey: 'passwordContextWord',
                    messagePath: 'auth.error.passwordContextWord',
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
