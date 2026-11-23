import { ProjectBypassRoleKeys } from '@modules/project/constants/project.constant';
import type { IProjectMemberActor } from '@modules/project/interfaces/project.interface';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectUtil {
    hasWorkspaceBypass(workspaceMember: IWorkspaceMemberWithRole): boolean {
        return ProjectBypassRoleKeys.includes(workspaceMember.role.key);
    }

    mapMemberActor(
        workspaceMember: IWorkspaceMemberWithRole
    ): IProjectMemberActor {
        const hasWorkspaceBypass = this.hasWorkspaceBypass(workspaceMember);

        return { userId: workspaceMember.userId, hasWorkspaceBypass };
    }
}
