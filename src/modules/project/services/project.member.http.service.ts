import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import type {
    IProjectMember,
    IProjectMemberWithRole,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberHttpService {
    constructor(
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly policyAbilityDomain: PolicyAbilityDomain
    ) {}

    async getMembersList(
        project: Project,
        query: ProjectMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.ProjectMemberWhereInput>(
                query,
                {
                    availableOrderBy: ProjectMemberDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.projectMemberDomain.getMembersList(project, params);

        return {
            data,
            ...others,
        };
    }

    async assignMember(
        project: Project,
        actorId: string,
        { userId, roleId }: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>> {
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.create,
            subject(EnumPolicySubject.ProjectMember, {
                projectId: project.id,
                userId,
                roleId,
            })
        );
        const targetMember =
            await this.workspaceMemberDomain.getOneByWorkspaceAndUser(
                project.workspaceId,
                userId
            );
        const member = await this.projectMemberDomain.assignMember(
            project,
            actorId,
            targetMember,
            roleId
        );

        return { data: member };
    }

    async updateMemberRole(
        project: Project,
        actorId: string,
        targetMemberId: string,
        { roleId }: ProjectMemberUpdateRoleRequestDto
    ): Promise<void> {
        const targetMember =
            await this.projectMemberDomain.getOneByIdAndProject(
                project.id,
                targetMemberId
            );
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.update,
            subject(EnumPolicySubject.ProjectMember, targetMember)
        );
        await this.projectMemberDomain.updateMemberRole(
            project,
            actorId,
            targetMember,
            roleId
        );
    }

    async removeMember(
        project: Project,
        actorId: string,
        targetMemberId: string
    ): Promise<void> {
        const targetMember =
            await this.projectMemberDomain.getOneByIdAndProject(
                project.id,
                targetMemberId
            );
        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        this.policyAbilityDomain.assertCan(
            ability,
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.ProjectMember, targetMember)
        );
        await this.projectMemberDomain.removeMember(
            project,
            actorId,
            targetMember
        );
    }

    async leaveProject(
        project: Project,
        member: IProjectMemberWithRole
    ): Promise<void> {
        await this.projectMemberDomain.leaveProject(project, member);
    }
}
