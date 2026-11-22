import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumMfaPasskeyDeviceType } from '@generated/prisma-client/client';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaGetStatusUseCase } from '@modules/mfa/use-cases/mfa.get-status.use-case';
import { buildAuthJwtAccessContext } from '@test/unit/helpers/test.unit.request.helper';

describe('MfaGetStatusUseCase', () => {
    const mfaService: MockProxy<MfaService> = mock<MfaService>();

    let useCase: MfaGetStatusUseCase;

    const authContext = buildAuthJwtAccessContext('user-marten');

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaGetStatusUseCase,
                { provide: MfaService, useValue: mfaService },
            ],
        }).compile();
        useCase = module.get(MfaGetStatusUseCase);
    });

    describe('execute', () => {
        it('wraps the MFA status of the caller', async () => {
            const status = {
                isEnabled: true,
                backupCodesRemaining: 1,
                totp: {
                    isEnabled: true,
                    isPendingConfirmation: false,
                    confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
                    lastUsedAt: null,
                },
                passkeys: [
                    {
                        id: 'passkey-one',
                        name: 'iPhone',
                        deviceType: EnumMfaPasskeyDeviceType.multiDevice,
                        backedUp: true,
                        createdAt: new Date('2026-02-01T00:00:00.000Z'),
                        lastUsedAt: null,
                    },
                ],
            };
            mfaService.getStatus.mockResolvedValue(status);

            await expect(useCase.execute(authContext)).resolves.toEqual({
                data: status,
            });
            expect(mfaService.getStatus).toHaveBeenCalledWith('user-marten');
        });
    });
});
