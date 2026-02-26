import {
    InviteProvider,
    InviteProviderMember,
} from '@modules/invite/interfaces/invite.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { Injectable } from '@nestjs/common';
import {
    EnumInviteType,
    EnumProjectMemberStatus,
    EnumRoleScope,
    EnumUserSignUpFrom,
} from '@prisma/client';

@Injectable()
export class ProjectInviteProvider implements InviteProvider {
    readonly roleScope: EnumRoleScope = EnumRoleScope.project;
    readonly invitationType = EnumInviteType.projectMember;
    readonly signUpFrom: EnumUserSignUpFrom = EnumUserSignUpFrom.project;

    constructor(private readonly projectRepository: ProjectRepository) {}

    async findMemberByUserId(
        contextId: string,
        userId: string
    ): Promise<InviteProviderMember | null> {
        const member = await this.projectRepository.findMemberByProjectAndUser(
            contextId,
            userId
        );

        if (!member) {
            return null;
        }

        return {
            id: member.id,
            status: member.status,
        };
    }

    async createMember(
        contextId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<string> {
        const member = await this.projectRepository.createMember({
            projectId: contextId,
            userId,
            roleId,
            status: EnumProjectMemberStatus.pending,
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
