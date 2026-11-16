import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { UserCreateSocialNonceUseCase } from '@modules/user/use-cases/user.create-social-nonce.use-case';

describe('UserCreateSocialNonceUseCase', () => {
    const authSocialService: MockProxy<AuthSocialService> =
        mock<AuthSocialService>();

    let useCase: UserCreateSocialNonceUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserCreateSocialNonceUseCase,
                { provide: AuthSocialService, useValue: authSocialService },
            ],
        }).compile();
        useCase = module.get(UserCreateSocialNonceUseCase);
    });

    describe('execute', () => {
        it('returns the nonce and its expiry under data', async () => {
            const expiredAt = new Date('2026-01-01T00:05:00.000Z');
            authSocialService.createNonce.mockResolvedValue({
                nonce: 'plain-nonce',
                expiredAt,
            });

            await expect(useCase.execute()).resolves.toEqual({
                data: { nonce: 'plain-nonce', expiredAt },
            });
        });
    });
});
