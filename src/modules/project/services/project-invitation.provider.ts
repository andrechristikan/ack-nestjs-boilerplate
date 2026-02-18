import {
    InvitationProvider,
    InvitationType,
} from '@modules/invitation/interfaces/invitation.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { Injectable } from '@nestjs/common';
import {
    EnumProjectMemberStatus,
    EnumRoleScope,
    EnumUserSignUpFrom,
} from '@prisma/client';

@Injectable()
export class ProjectInvitationProvider implements InvitationProvider {
    readonly roleScope: EnumRoleScope = EnumRoleScope.project;
    readonly invitationType: InvitationType = 'project_member';
    readonly signUpFrom: EnumUserSignUpFrom = EnumUserSignUpFrom.project;

    constructor(private readonly projectRepository: ProjectRepository) {}

    async existsMember(contextId: string, userId: string): Promise<boolean> {
        const member = await this.projectRepository.findMemberByProjectAndUser(
            contextId,
            userId
        );

        return !!member;
    }

    async addMember(
        contextId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<string> {
        const member = await this.projectRepository.addMember({
            projectId: contextId,
            userId,
            roleId,
            status: EnumProjectMemberStatus.active,
            createdBy,
            updatedBy: createdBy,
        });

        return member.id;
    }

    async findMemberUserId(
        contextId: string,
        memberId: string
    ): Promise<string | null> {
        const member = await this.projectRepository.findOneMemberByIdAndProject(
            memberId,
            contextId
        );

        return member?.user?.id ?? null;
    }

    async getContextName(contextId: string): Promise<string | null> {
        const project = await this.projectRepository.findOneById(contextId);

        return project?.name ?? null;
    }
}
