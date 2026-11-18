import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { SessionService } from '@modules/session/services/session.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserProcessPurgeExpiredUseCase } from '@modules/user/use-cases/user.process-purge-expired.use-case';

describe('UserProcessPurgeExpiredUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();

    let useCase: UserProcessPurgeExpiredUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProcessPurgeExpiredUseCase,
                { provide: MessageService, useValue: messageService },
                { provide: SessionService, useValue: sessionService },
                {
                    provide: MfaChallengeService,
                    useValue: mfaChallengeService,
                },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                {
                    provide: UserPasswordService,
                    useValue: userPasswordService,
                },
            ],
        }).compile();

        useCase = module.get(UserProcessPurgeExpiredUseCase);
    });

    describe('execute', () => {
        it('purges every expired identity row and reports each count', async () => {
            sessionService.purgeExpired.mockResolvedValue(1);
            mfaChallengeService.purgeExpired.mockResolvedValue(2);
            passwordHistoryService.purgeExpired.mockResolvedValue(3);
            userVerificationService.purgeExpired.mockResolvedValue(4);
            userPasswordService.purgeExpired.mockResolvedValue(5);

            const result = await useCase.execute();

            expect(result).toEqual({
                message: 'user.queue.purgeExpired',
                sessions: 1,
                mfaChallenges: 2,
                passwordHistories: 3,
                verifications: 4,
                forgotPasswords: 5,
            });
        });

        it('rejects when one purge rejects', async () => {
            const error = new Error('db down');
            sessionService.purgeExpired.mockResolvedValue(0);
            mfaChallengeService.purgeExpired.mockRejectedValue(error);
            passwordHistoryService.purgeExpired.mockResolvedValue(0);
            userVerificationService.purgeExpired.mockResolvedValue(0);
            userPasswordService.purgeExpired.mockResolvedValue(0);

            await expect(useCase.execute()).rejects.toBe(error);
        });
    });
});
