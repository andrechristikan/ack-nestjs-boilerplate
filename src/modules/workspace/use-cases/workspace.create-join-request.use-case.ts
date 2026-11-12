import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceCreateJoinRequestUseCase implements IAppUseCase<
    [IRequestContextUser, WorkspaceJoinRequestCreateRequestDto],
    IResponseReturn<WorkspaceJoinRequest>
> {
    constructor(
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly userService: UserService
    ) {}

    async execute(
        context: IRequestContextUser,
        { workspaceId, message }: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.workspaceJoinRequestService.assertJoinRequestAllowed();
        const workspace =
            await this.workspaceJoinRequestService.getJoinableWorkspace(
                context.user.id,
                workspaceId
            );

        const [requester, reviewerIds] = await Promise.all([
            this.userService.getNameById(context.user.id),
            this.workspaceMemberService.getReviewerUserIds(workspace.id),
        ]);
        const requesterName =
            this.workspaceJoinRequestService.resolveRequesterName(requester);
        const joinRequest =
            await this.workspaceJoinRequestService.createJoinRequest(
                context.snapshot,
                { workspaceId, message: message ?? null },
                { workspaceName: workspace.name, requesterName, reviewerIds }
            );

        return { data: joinRequest };
    }
}
