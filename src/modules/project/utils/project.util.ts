import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ResponseUtil } from '@common/response/utils/response.util';
import { Project, WorkspaceMember } from '@generated/prisma-client';
import { ProjectWorkspaceBypassRole } from '@modules/project/constants/project.constant';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project.member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectUtil {
    constructor(
        private readonly responseUtil: ResponseUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    getCurrentRequestLog(): IRequestLog {
        return this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
    }

    isWorkspaceOwner(workspaceMember: WorkspaceMember): boolean {
        return workspaceMember.role === ProjectWorkspaceBypassRole;
    }

    mapOne(project: Project): ProjectResponseDto {
        return this.responseUtil.serialize(ProjectResponseDto, project);
    }

    mapList(projects: Project[]): ProjectResponseDto[] {
        return this.responseUtil.serialize(ProjectResponseDto, projects);
    }

    mapMember(member: IProjectMember): ProjectMemberResponseDto {
        return this.responseUtil.serialize(ProjectMemberResponseDto, member);
    }

    mapMemberList(members: IProjectMember[]): ProjectMemberResponseDto[] {
        return this.responseUtil.serialize(ProjectMemberResponseDto, members);
    }
}
