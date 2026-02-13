import { Injectable } from '@nestjs/common';
import { ProjectRoleViewer } from '@modules/project/constants/project.constant';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { IProject, IProjectMember } from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectUtil {
    mapProject(project: IProject): ProjectResponseDto {
        return {
            id: project.id,
            tenantId: project.tenantId ?? undefined,
            name: project.name,
            status: project.status,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }

    mapMember(member: IProjectMember): ProjectMemberResponseDto {
        return {
            id: member.id,
            projectId: member.projectId,
            userId: member.userId,
            roleName: member.role?.name ?? ProjectRoleViewer,
            status: member.status,
            createdAt: member.createdAt,
        };
    }

    mapMemberProjectAccess(project: IProject): ProjectAccessResponseDto {
        return {
            accessType: 'member',
            project: this.mapProject(project),
        };
    }
}
