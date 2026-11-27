import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserProcessPurgeExpiredUseCase } from '@modules/user/use-cases/user.process-purge-expired.use-case';

describe('UserProcessPurgeExpiredUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();

    let useCase: UserProcessPurgeExpiredUseCase;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProcessPurgeExpiredUseCase,
                { provide: MessageService, useValue: messageService },
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
        it('purges expired verifications and forgot-password requests and reports each count', async () => {
            userVerificationService.purgeExpired.mockResolvedValue(4);
            userPasswordService.purgeExpiredForgotPasswords.mockResolvedValue(
                5
            );

            const result = await useCase.execute();

            expect(userVerificationService.purgeExpired).toHaveBeenCalledTimes(
                1
            );
            expect(
                userPasswordService.purgeExpiredForgotPasswords
            ).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                message: 'user.queue.auth.purgeExpired',
                verifications: 4,
                forgotPasswords: 5,
            });
        });

        it('rejects when one purge rejects', async () => {
            const error = new Error('db down');
            userVerificationService.purgeExpired.mockRejectedValue(error);
            userPasswordService.purgeExpiredForgotPasswords.mockResolvedValue(
                0
            );

            await expect(useCase.execute()).rejects.toBe(error);
        });
    });
});
