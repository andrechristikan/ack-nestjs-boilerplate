import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyUserAcceptUseCase } from '@modules/term-policy/use-cases/term-policy.user-accept.use-case';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('TermPolicyUserAcceptUseCase', () => {
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const user: IUser = {
        id: 'user-1',
        name: 'Andre Christi',
        username: 'johnSmith123',
        isVerified: true,
        verifiedAt: timestamp,
        email: 'andre@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: timestamp,
        passwordAttempt: 0,
        signUpAt: timestamp,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: timestamp,
            createdBy: null,
            updatedAt: timestamp,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    let useCase: TermPolicyUserAcceptUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyUserAcceptUseCase,
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(TermPolicyUserAcceptUseCase);
    });

    describe('execute', () => {
        const preparedActivityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userAcceptTermPolicy,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };

        beforeEach(() => {
            activityLogService.prepare.mockReturnValue(preparedActivityLog);
        });

        it('accepts, then stages the activity log', async () => {
            const calls: string[] = [];
            termPolicyAcceptanceService.userAccept.mockImplementation(
                async () => {
                    calls.push('accept');
                }
            );
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            const result = await useCase.execute(user, {
                type: EnumTermPolicyType.privacy,
            });

            expect(result).toEqual({});
            expect(calls).toEqual(['accept', 'stage']);
            expect(termPolicyAcceptanceService.userAccept).toHaveBeenCalledWith(
                'user-1',
                EnumTermPolicyType.privacy
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userAcceptTermPolicy,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });

        it('stages nothing when the domain rejects', async () => {
            const error = new Error('already accepted');
            termPolicyAcceptanceService.userAccept.mockRejectedValue(error);

            const promise = useCase.execute(user, {
                type: EnumTermPolicyType.privacy,
            });

            await expect(promise).rejects.toBe(error);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
