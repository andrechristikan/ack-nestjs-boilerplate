import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type {
    IProjectContext,
    IProjectMember,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class ProjectAssignMemberUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        IProjectContext,
        IPolicyContext,
        ProjectMemberAssignRequestDto,
    ],
    IResponseReturn<IProjectMember>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectUtil: ProjectUtil,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        projectContext: IProjectContext,
        policyContext: IPolicyContext,
        { userId, roleId }: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>> {
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.create,
            subject(EnumPolicySubject.ProjectMember, {
                projectId: projectContext.project.id,
            })
        );
        const actor = this.projectUtil.mapMemberActor(
            workspaceContext.workspaceMember
        );
        const targetMember =
            await this.workspaceMemberService.getOneByWorkspaceAndUser(
                projectContext.project.workspaceId,
                userId
            );
        const member = await this.projectMemberService.assignMember(
            requestContext,
            apiKeyContext,
            authContext,
            projectContext.project,
            actor,
            targetMember,
            roleId
        );

        return { data: member };
    }
}
