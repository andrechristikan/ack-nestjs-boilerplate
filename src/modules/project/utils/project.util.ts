import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ProjectBypassRoles } from '@modules/project/constants/project.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectUtil {
    hasWorkspaceBypass(workspaceMember: WorkspaceMember): boolean {
        return ProjectBypassRoles.includes(workspaceMember.role);
    }
}
