import { WorkspaceMember } from '@generated/prisma-client';
import { ProjectWorkspaceBypassRole } from '@modules/project/constants/project.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectUtil {
    isWorkspaceOwner(workspaceMember: WorkspaceMember): boolean {
        return workspaceMember.role === ProjectWorkspaceBypassRole;
    }
}
