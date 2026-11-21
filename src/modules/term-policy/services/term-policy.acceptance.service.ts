import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';
import type {
    ITermPolicyAcceptanceCreate,
    ITermPolicyRef,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class TermPolicyAcceptanceService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly outboxService: OutboxService,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly activityLogQueue: ActivityLogQueue
    ) {}

    async getPendingForUser(
        userId: string,
        required: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]> {
        const types =
            required.length === 0 ? TermPolicyDefaultRequiredTypes : required;
        const latest =
            await this.termPolicyRepository.findLatestPublishedWithAcceptanceByUser(
                types,
                userId
            );

        return latest
            .filter(ref => ref.userAcceptances.length === 0)
            .map(({ id, type, version }) => ({ id, type, version }));
    }

    async validateTermPolicyGuard(
        userId: string,
        required: EnumTermPolicyType[]
    ): Promise<void> {
        const pending = await this.getPendingForUser(userId, required);
        if (pending.length > 0) {
            throw new TermPolicyRequiredInvalidException();
        }
    }

    async assertRequiredPublished(
        required: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]> {
        const refs =
            await this.termPolicyRepository.findLatestPublishedByTypes(
                required
            );
        const published = new Set(refs.map(ref => ref.type));
        const allPublished = required.every(type => published.has(type));
        if (!allPublished) {
            throw new TermPolicyRequiredNotPublishedException();
        }

        return refs;
    }

    async getLatestPublishedByType(
        type: EnumTermPolicyType
    ): Promise<ITermPolicyRef> {
        const [latest] =
            await this.termPolicyRepository.findLatestPublishedByTypes([type]);
        if (!latest) {
            throw new TermPolicyNotFoundException();
        }

        return latest;
    }

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
        return this.termPolicyRepository.findUserAccepted(userId, pagination);
    }

    async acceptPublishedManyInTx(
        tx: IDatabaseTransactionClient,
        entries: ITermPolicyAcceptanceCreate[]
    ): Promise<void> {
        if (entries.length === 0) {
            return;
        }

        const acceptedAt = this.helperDateService.create();
        const types = [...new Set(entries.flatMap(entry => entry.types))];
        const refs =
            await this.termPolicyRepository.findLatestPublishedByTypesInTx(
                tx,
                types
            );
        const rows = entries.flatMap(
            ({ userId, types: acceptedTypes, createdBy }) => {
                const accepted = new Set(acceptedTypes);

                return refs
                    .filter(ref => accepted.has(ref.type))
                    .map(ref => ({
                        userId,
                        termPolicyId: ref.id,
                        createdBy,
                        acceptedAt,
                    }));
            }
        );

        await this.termPolicyRepository.acceptManyInTx(tx, rows);
    }

    async userAcceptInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        termPolicy: ITermPolicyRef
    ): Promise<void> {
        const userId = authContext.userId;
        const acceptedAt = this.helperDateService.create();
        await this.termPolicyRepository.acceptInTx(
            tx,
            userId,
            termPolicy.id,
            userId,
            acceptedAt
        );

        const effect = this.notificationQueue.notify(
            EnumNotificationKind.userAcceptTermPolicy,
            {
                userId,
                proceedBy: userId,
                termPolicyId: termPolicy.id,
                type: termPolicy.type,
                version: termPolicy.version,
            }
        );

        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userTermPolicyAccepted,
            }
        );
        await this.outboxService.addManyInTx(tx, [effect, entry]);
    }
}
