import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserSendVerificationEmailUseCase } from '@modules/user/use-cases/user.send-verification-email.use-case';

describe('UserSendVerificationEmailUseCase', () => {
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: UserSendVerificationEmailUseCase;

    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userVerifiedEmail,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const user: User = {
        id: 'user-wren',
        name: 'Wren',
        username: 'wren',
        isVerified: false,
        verifiedAt: null,
        email: 'wren@example.com',
        roleId: 'role-1',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(activityLog);
        userVerificationService.getOneForResendByEmail.mockResolvedValue(user);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSendVerificationEmailUseCase,
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserSendVerificationEmailUseCase);
    });

    describe('execute', () => {
        const dto: UserSendEmailVerificationRequestDto = {
            email: 'wren@example.com',
        };

        it('sends the verification email through the service, stages the activity row, and answers empty', async () => {
            const result = await useCase.execute(dto);

            expect(result).toEqual({});
            expect(
                userVerificationService.getOneForResendByEmail
            ).toHaveBeenCalledWith('wren@example.com');
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: 'user-wren',
                createdBy: 'user-wren',
            });
            expect(userVerificationService.sendEmail).toHaveBeenCalledWith(
                'user-wren',
                'wren@example.com'
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('reads the gate, commits the email effect, then stages in order', async () => {
            const callOrder: string[] = [];
            userVerificationService.getOneForResendByEmail.mockImplementation(
                async () => {
                    callOrder.push('getOneForResendByEmail');

                    return user;
                }
            );
            userVerificationService.sendEmail.mockImplementation(async () => {
                callOrder.push('sendEmail');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await useCase.execute(dto);

            expect(callOrder).toEqual([
                'getOneForResendByEmail',
                'sendEmail',
                'stagePrepared',
            ]);
        });

        it('answers empty and sends nothing when the account is missing, inactive, or already verified', async () => {
            userVerificationService.getOneForResendByEmail.mockResolvedValue(
                null
            );

            await expect(useCase.execute(dto)).resolves.toEqual({});

            expect(userVerificationService.sendEmail).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages nothing when the send rejects', async () => {
            userVerificationService.sendEmail.mockRejectedValue(
                new Error('commit-failed')
            );

            await expect(useCase.execute(dto)).rejects.toThrow('commit-failed');

            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
