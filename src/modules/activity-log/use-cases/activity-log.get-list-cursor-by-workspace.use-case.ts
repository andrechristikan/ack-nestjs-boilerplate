import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { ActivityLogSharedListRequestDto } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import type { IActivityLogMasked } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { Injectable } from '@nestjs/common';
import {
    ActivityLogDefaultAvailableOrderBy,
    ActivityLogSharedWorkspaceListCursorScope,
} from '@modules/activity-log/constants/activity-log.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class ActivityLogGetListCursorByWorkspaceUseCase implements IAppUseCase<
    [IAuthJwtAccessContext, IWorkspaceContext, ActivityLogSharedListRequestDto],
    IResponsePaginationReturn<IActivityLogMasked>
> {
    constructor(
        private readonly activityLogService: ActivityLogService,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        query: ActivityLogSharedListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLogMasked>> {
        const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
            scope: ActivityLogSharedWorkspaceListCursorScope,
            availableOrderBy: ActivityLogDefaultAvailableOrderBy,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.activityLogService.getListCursorByWorkspace(
                workspaceContext.workspace.id,
                authContext.userId,
                params
            );

        const maskedData = this.activityLogUtil.toMaskedList(
            data,
            authContext.userId
        );

        return { data: maskedData, ...others };
    }
}
