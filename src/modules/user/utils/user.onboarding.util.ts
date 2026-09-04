import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import {
    IUserOnboardingWorkspaceRows,
    IUserSignUpWorkspaceContext,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

/** Builds the workspace rows a new account is created with, for both the personal and the invite branch. */
@Injectable()
export class UserOnboardingUtil {
    constructor(private readonly helperDateService: HelperDateService) {}

    buildWorkspaceRows(
        userId: string,
        workspaceContext: IUserSignUpWorkspaceContext,
        actorId: string
    ): IUserOnboardingWorkspaceRows {
        if (
            workspaceContext.type ===
            EnumUserSignUpWorkspaceContextType.personal
        ) {
            return {
                workspace: {
                    data: {
                        id: workspaceContext.workspaceId,
                        name: workspaceContext.name,
                        slug: workspaceContext.slug,
                        createdBy: actorId,
                        deletedAt: null,
                    },
                },
                workspaceMember: {
                    data: {
                        workspaceId: workspaceContext.workspaceId,
                        userId,
                        role: EnumWorkspaceMemberRole.owner,
                        createdBy: actorId,
                    },
                },
                workspaceInvite: null,
                projectMember: null,
            };
        }

        return {
            workspace: null,
            workspaceMember: {
                data: {
                    workspaceId: workspaceContext.workspaceId,
                    userId,
                    role: workspaceContext.workspaceMemberRole,
                    createdBy: actorId,
                },
            },
            workspaceInvite: {
                where: { id: workspaceContext.workspaceInviteId },
                data: {
                    status: EnumWorkspaceInviteStatus.accepted,
                    acceptedAt: this.helperDateService.create(),
                    acceptedByUserId: userId,
                    updatedBy: actorId,
                },
            },
            projectMember:
                workspaceContext.projectId && workspaceContext.projectMemberRole
                    ? {
                          data: {
                              projectId: workspaceContext.projectId,
                              userId,
                              role: workspaceContext.projectMemberRole,
                              createdBy: actorId,
                          },
                      }
                    : null,
        };
    }
}
