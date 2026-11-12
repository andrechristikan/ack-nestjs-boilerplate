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
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { User, Verification } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserVerifyEmailUseCase } from '@modules/user/use-cases/user.verify-email.use-case';

describe('UserVerifyEmailUseCase', () => {
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: UserVerifyEmailUseCase;

    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userVerifiedEmail,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const verification: Verification = {
        id: 'verification-wren',
        userId: 'user-wren',
        mobileNumberId: null,
        to: 'wren@example.com',
        type: EnumVerificationType.email,
        token: 'hashed-token',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        verifiedAt: null,
        isUsed: false,
        reference: 'VRF-wren',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        createdBy: null,
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
        userVerificationService.getOneActiveByEmailToken.mockResolvedValue({
            verification,
            user,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerifyEmailUseCase,
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserVerifyEmailUseCase);
    });

    describe('execute', () => {
        it('verifies the token, which adds the verifiedEmail effect, then stages the activity row', async () => {
            const callOrder: string[] = [];
            const dto: UserVerifyEmailRequestDto = { token: 'raw-token' };
            userVerificationService.verifyEmail.mockImplementation(async () => {
                callOrder.push('verifyEmail');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            const result = await useCase.execute(dto);

            expect(result).toEqual({});
            expect(
                userVerificationService.getOneActiveByEmailToken
            ).toHaveBeenCalledWith('raw-token');
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: 'user-wren',
                createdBy: 'user-wren',
            });
            expect(userVerificationService.verifyEmail).toHaveBeenCalledWith(
                verification
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(callOrder).toEqual(['verifyEmail', 'stagePrepared']);
        });

        it('stages nothing when the verify write rejects', async () => {
            userVerificationService.verifyEmail.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute({ token: 'raw-token' })
            ).rejects.toThrow('boom');

            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
