import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteReferenceExistException } from '@modules/workspace/exceptions/workspace.invite-reference-exist.exception';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import type {
    IWorkspaceContext,
    IWorkspaceInviteList,
} from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceResendInviteUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        IWorkspaceContext,
        string,
        WorkspaceInviteResendRequestDto,
    ],
    IResponseReturn<IWorkspaceInviteList>
> {
    private readonly referenceMaxAttempts: number;

    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
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
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<IWorkspaceInviteList>> {
        this.workspaceInviteService.assertEmailDeliverable();

        const [existing, expiresInDays] = await Promise.all([
            this.workspaceInviteService.getResendableById(
                workspaceInviteId,
                workspaceContext.workspace.id
            ),
            this.workspaceInviteService.resolveExpiresInDays(
                expiryDuration ?? null
            ),
        ]);

        const inviterName = this.userUtil.getDisplayName(userContext.user);
        const existingUser = await this.userService.getOneActiveByEmail(
            existing.email
        );

        const notice = {
            workspaceName: workspaceContext.workspace.name,
            inviterName,
            inviteeUserId: existingUser?.id ?? null,
        };

        let collision: WorkspaceInviteReferenceExistException | null = null;

        for (let attempt = 0; attempt < this.referenceMaxAttempts; attempt++) {
            const tokenData =
                this.workspaceInviteService.createInviteTokenData(
                    expiresInDays
                );

            try {
                const invite = await this.databaseService.withTransaction(
                    async tx =>
                        this.workspaceInviteService.resendInviteInTx(
                            tx,
                            requestContext,
                            apiKeyContext,
                            authContext,
                            workspaceInviteId,
                            tokenData,
                            notice
                        )
                );

                const censored = this.workspaceUtil.toCensoredInvite(invite);

                return { data: censored };
            } catch (err: unknown) {
                if (err instanceof WorkspaceInviteReferenceExistException) {
                    collision = err;
                    continue;
                }

                if (err instanceof AppBaseException) {
                    throw err;
                }

                throw new AppUnknownException(err);
            }
        }

        throw new AppUnknownException(collision);
    }
}
