import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import type { INotificationWorkspaceInvitePushPayload } from '@modules/notification/interfaces/notification.interface';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateWithWorkspaceInput } from '@modules/user/interfaces/user.interface';
import type { IWorkspaceOwnedUser } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceUtil {
    constructor(private readonly helperDateService: HelperDateService) {}

    mapInviteNotificationPayload(
        workspace: Workspace,
        invite: WorkspaceInvite,
        inviterName: string
    ): INotificationWorkspaceInvitePushPayload {
        const expiredAt = this.helperDateService.formatToIso(invite.expiredAt);

        return {
            workspaceId: invite.workspaceId,
            workspaceName: workspace.name,
            inviterName,
            workspaceMemberRole: invite.workspaceRole,
            reference: invite.reference,
            expiredAt,
        };
    }

    buildOwnedUsers(
        inputs: IUserCreateWithWorkspaceInput[],
        slugAttempt: number
    ): IWorkspaceOwnedUser[] {
        return inputs.flatMap(input => {
            if (
                input.workspaceContext.type !==
                EnumUserSignUpWorkspaceContextType.personal
            ) {
                return [];
            }

            return [
                {
                    userId: input.userId,
                    workspaceId: input.workspaceContext.workspaceId,
                    name: input.workspaceContext.name,
                    slug: input.workspaceContext.slugCandidates[slugAttempt]!,
                },
            ];
        });
    }

    countSlugAttempts(inputs: IUserCreateWithWorkspaceInput[]): number {
        const slugAttemptCount = inputs.reduce((min, input) => {
            if (
                input.workspaceContext.type !==
                EnumUserSignUpWorkspaceContextType.personal
            ) {
                return min;
            }

            return Math.min(min, input.workspaceContext.slugCandidates.length);
        }, Number.POSITIVE_INFINITY);

        return Number.isFinite(slugAttemptCount) ? slugAttemptCount : 1;
    }
}
