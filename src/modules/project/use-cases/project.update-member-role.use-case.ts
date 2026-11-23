import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectUpdateMemberRoleUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        IProjectContext,
        IPolicyContext,
        string,
        ProjectMemberUpdateRoleRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
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
        targetMemberId: string,
        { roleId }: ProjectMemberUpdateRoleRequestDto
    ): Promise<IResponseReturn<void>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.update,
            EnumPolicySubject.ProjectMember
        );
        const actor = this.projectUtil.mapMemberActor(
            workspaceContext.workspaceMember
        );
        await this.projectMemberService.updateMemberRole(
            requestContext,
            apiKeyContext,
            authContext,
            projectContext.project,
            actor,
            targetMemberId,
            roleId,
            additionalWhere
        );

        return {};
    }
}
