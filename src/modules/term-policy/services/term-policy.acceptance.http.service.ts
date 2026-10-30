import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicyAcceptedListRequestDto } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import type { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { TermPolicyAcceptanceDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';

@Injectable()
export class TermPolicyAcceptanceHttpService {
    constructor(
        private readonly termPolicyAcceptanceDomain: TermPolicyAcceptanceDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly accountDomain: AccountDomain,
        private readonly notificationQueue: NotificationQueue
    ) {}

    async getListUserAccepted(
        userId: string,
        query: TermPolicyAcceptedListRequestDto
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.TermPolicyUserAcceptanceWhereInput>(
                query,
                {
                    availableOrderBy:
                        TermPolicyAcceptanceDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.termPolicyAcceptanceDomain.getListUserAccepted(
                userId,
                params
            );
        return {
            data,
            ...others,
        };
    }

    async userAccept(
        user: IUser,
        { type }: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userAcceptTermPolicy,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        const recipient =
            await this.accountDomain.getNotificationRecipientOfUser(
                user,
                EnumNotificationKind.userAcceptTermPolicy
            );
        const accepted = await this.termPolicyAcceptanceDomain.userAccept(
            user.id,
            type
        );
        this.activityLogDomain.stagePrepared(activityLogs);

        await this.notificationQueue.sendUserAcceptTermPolicy(recipient, {
            termPolicyId: accepted.id,
            type: accepted.type,
            version: accepted.version,
        });

        return {};
    }
}
