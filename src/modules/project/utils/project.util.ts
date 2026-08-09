import { ResponseUtil } from '@common/response/utils/response.util';
import { Project } from '@generated/prisma-client';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project.member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectUtil {
    constructor(private readonly responseUtil: ResponseUtil) {}

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
