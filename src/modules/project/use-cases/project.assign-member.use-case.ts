import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type {
    IProjectContext,
    IProjectMember,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
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
        ProjectMemberAssignRequestDto,
    ],
    IResponseReturn<IProjectMember>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectUtil: ProjectUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        projectContext: IProjectContext,
        { userId, role }: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>> {
        const actor = this.projectUtil.mapMemberActor(
            workspaceContext.workspaceMember
        );
        const targetMember =
            await this.workspaceMemberService.getOneByWorkspaceAndUser(
                projectContext.project.workspaceId,
                userId
            );
        const assignable = this.projectMemberService.assertAssignable(
            projectContext.project,
            actor,
            targetMember,
            role
        );

        try {
            const member = await this.databaseService.withTransaction(
                async tx =>
                    this.projectMemberService.assignMemberInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        projectContext.project,
                        actor,
                        assignable,
                        role
                    )
            );

            return { data: member };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isAlreadyAssigned = this.databaseUtil.isUniqueCollision(
                err,
                'userId'
            );
            if (isAlreadyAssigned) {
                throw new ProjectMemberAlreadyAssignedException();
            }

            throw new AppUnknownException(err);
        }
    }
}
