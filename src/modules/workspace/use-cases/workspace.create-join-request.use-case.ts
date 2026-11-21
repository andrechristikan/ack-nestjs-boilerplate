import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class WorkspaceCreateJoinRequestUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        WorkspaceJoinRequestCreateRequestDto,
    ],
    IResponseReturn<WorkspaceJoinRequest>
> {
    constructor(
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { workspaceId, message }: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        const create = { workspaceId, message: message ?? null };
        const [{ workspace, reviewerIds }, prepared] = await Promise.all([
            this.workspaceJoinRequestService.getJoinableWorkspace(
                authContext.userId,
                workspaceId
            ),
            this.workspaceJoinRequestService.prepareJoinRequest(
                authContext,
                create
            ),
            this.workspaceJoinRequestService.assertJoinRequestAllowed(),
        ]);
        const requesterName = this.userUtil.getDisplayName(userContext.user);

        try {
            const joinRequest = await this.databaseService.withTransaction(
                async tx =>
                    this.workspaceJoinRequestService.createJoinRequestInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        authContext,
                        create,
                        prepared,
                        {
                            workspaceName: workspace.name,
                            requesterName,
                            reviewerIds,
                        }
                    )
            );

            return { data: joinRequest };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isDuplicate = this.databaseUtil.isUniqueCollision(
                err,
                'nonce'
            );
            if (isDuplicate) {
                throw new WorkspaceJoinRequestDuplicateException();
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceJoinRequestDuplicateException();
            }

            throw new AppUnknownException(err);
        }
    }
}
