import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ProjectBypassRoles } from '@modules/project/constants/project.constant';
import type { IProjectMemberActor } from '@modules/project/interfaces/project.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectUtil {
    hasWorkspaceBypass(workspaceMember: WorkspaceMember): boolean {
        return ProjectBypassRoles.has(workspaceMember.role);
    }

    mapMemberActor(workspaceMember: WorkspaceMember): IProjectMemberActor {
        const hasWorkspaceBypass = this.hasWorkspaceBypass(workspaceMember);

        return { userId: workspaceMember.userId, hasWorkspaceBypass };
    }
}
