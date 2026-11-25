import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import { ProjectService } from '@modules/project/services/project.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteReferenceExistException } from '@modules/workspace/exceptions/workspace.invite-reference-exist.exception';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import type {
    IWorkspaceContext,
    IWorkspaceInviteCreate,
    IWorkspaceInviteList,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class WorkspaceCreateInviteUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        IWorkspaceContext,
        WorkspaceInviteCreateRequestDto,
    ],
    IResponseReturn<IWorkspaceInviteList>
> {
    private readonly referenceMaxAttempts: number;

    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly projectService: ProjectService,
        private readonly userService: UserService,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly configService: ConfigService
    ) {
        this.referenceMaxAttempts = this.configService.get<number>(
            'workspace.invite.referenceMaxAttempts'
        )!;
    }

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        workspaceContext: IWorkspaceContext,
        {
            email,
            workspaceRole,
            projectId,
            projectRole,
            expiryDuration,
        }: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<IWorkspaceInviteList>> {
        this.workspaceInviteService.assertEmailDeliverable();

        const create: IWorkspaceInviteCreate = {
            email,
            workspaceRole,
            projectId: projectId ?? null,
            projectRole: projectRole ?? null,
            expiryDuration: expiryDuration ?? null,
        };
        let projectLookup: Promise<Project | null> | null = null;
        if (create.projectId !== null) {
            projectLookup = this.projectService.getActiveByIdAndWorkspace(
                create.projectId,
                workspaceContext.workspace.id
            );
        }

        const [project, existingUser, prepared] = await Promise.all([
            projectLookup,
            this.userService.getOneActiveByEmail(create.email),
            this.workspaceInviteService.prepareInvite(
                workspaceContext.workspace.id,
                create
            ),
            this.workspaceInviteService.assertProjectRolePaired(create),
        ]);
        this.workspaceInviteService.assertCreatable(create, project);
        if (existingUser) {
            await this.workspaceInviteService.assertInviteeNotMember(
                workspaceContext.workspace.id,
                existingUser.id
            );
        }

        const inviterName = this.userUtil.getDisplayName(userContext.user);
        const notice = {
            workspaceName: workspaceContext.workspace.name,
            inviterName,
            inviteeUserId: existingUser?.id ?? null,
        };

        for (let attempt = 0; attempt < this.referenceMaxAttempts; attempt++) {
            const tokenData = this.workspaceInviteService.createInviteTokenData(
                prepared.expiresInDays
            );

            try {
                const invite = await this.databaseService.withTransaction(
                    async tx =>
                        this.workspaceInviteService.createInviteInTx(
                            tx,
                            requestContext,
                            apiKeyContext,
                            authContext,
                            workspaceContext.workspace.id,
                            create,
                            prepared,
                            tokenData,
                            notice
                        )
                );

                const censored = this.workspaceUtil.toCensoredInvite(invite);

                return { data: censored };
            } catch (err: unknown) {
                if (err instanceof WorkspaceInviteReferenceExistException) {
                    continue;
                }

                if (err instanceof AppBaseException) {
                    throw err;
                }

                throw new AppUnknownException(err);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }
}
