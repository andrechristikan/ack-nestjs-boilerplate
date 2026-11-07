import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserClaimUsernameUseCase } from '@modules/user/use-cases/user.claim-username.use-case';

describe('UserClaimUsernameUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: UserClaimUsernameUseCase;

    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userUpdateProfile,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.prepare.mockReturnValue(activityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserClaimUsernameUseCase,
                { provide: UserProfileService, useValue: userProfileService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();
        useCase = module.get(UserClaimUsernameUseCase);
    });

    describe('execute', () => {
        it('delegates the username to the domain', async () => {
            const dto: UserClaimUsernameRequestDto = {
                username: 'sableGrove' as Lowercase<string>,
            };

            await useCase.execute('user-sable', dto);

            expect(userProfileService.claimUsername).toHaveBeenCalledWith(
                'user-sable',
                dto.username
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userClaimUsername,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });
    });
});
