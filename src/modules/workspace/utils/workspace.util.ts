import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateWithWorkspaceInput } from '@modules/user/interfaces/user.interface';
import type { IWorkspaceOwnedUser } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceUtil {
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
