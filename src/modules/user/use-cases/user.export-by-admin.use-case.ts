import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserImportService } from '@modules/user/services/user.import.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserExportByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        UserExportRequestDto,
    ],
    IResponseReturn<UserExportResponseDto>
> {
    constructor(
        private readonly userQueue: UserQueue,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly userImportService: UserImportService,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        query: UserExportRequestDto
    ): Promise<IResponseReturn<UserExportResponseDto>> {
        const statusFilter = this.paginationFilterUtil.inEnum(
            Prisma.UserScalarFieldEnum.status,
            query.status,
            UserDefaultStatus
        );
        const status = this.userImportService.resolveExportByAdminStatus(
            statusFilter?.where ?? null
        );
        const roleId = query.roleId ?? null;
        const countryId = query.countryId ?? null;

        // Sequential by design: cheap check before the work it guards; write after its checks
        this.userImportService.assertExportByAdminDeliverable();
        await this.userImportService.assertExportByAdminWithinCap(
            status,
            roleId,
            countryId
        );

        const activityLog = this.activityLogQueue.toPayload(
            requestContext,
            apiKeyContext,
            authContext,
            null
        );
        const effect = this.userQueue.exportByAdminEffect(
            status,
            roleId,
            countryId,
            activityLog
        );
        const outboxId = await this.databaseService.withTransaction(async tx =>
            this.outboxService.addInTx(tx, effect)
        );

        return { data: { outboxId } };
    }
}
