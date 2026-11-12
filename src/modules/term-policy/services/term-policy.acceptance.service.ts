import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { IRequestContextUserSnapshot } from '@common/request/interfaces/request.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
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
    Prisma,
} from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyAcceptanceService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly outboxService: OutboxService,
        private readonly notificationService: NotificationService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogService: ActivityLogService
    ) {}

    async getPendingForUser(
        userId: string,
        required: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]> {
        const types =
            required.length === 0 ? TermPolicyDefaultRequiredTypes : required;
        const latest =
            await this.termPolicyRepository.findLatestPublishedByTypes(types);
        if (latest.length === 0) {
            return [];
        }

        const accepted =
            await this.termPolicyRepository.findAcceptedTermPolicyIdsByUser(
                userId,
                latest.map(ref => ref.id)
            );

        return latest.filter(ref => !accepted.includes(ref.id));
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

    async assertRequiredPublishedInTx(
        tx: IDatabaseTransactionClient,
        required: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]> {
        const refs =
            await this.termPolicyRepository.findLatestPublishedByTypesInTx(
                tx,
                required
            );
        const allPublished = required.every(type =>
            refs.some(ref => ref.type === type)
        );
        if (!allPublished) {
            throw new TermPolicyRequiredNotPublishedException();
        }

        return refs;
    }

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
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
        const rows = entries.flatMap(({ userId, types: accepted, createdBy }) =>
            refs
                .filter(ref => accepted.includes(ref.type))
                .map(ref => ({
                    userId,
                    termPolicyId: ref.id,
                    createdBy,
                    acceptedAt,
                }))
        );

        await this.termPolicyRepository.acceptManyInTx(tx, rows);
    }

    async userAccept(
        snapshot: IRequestContextUserSnapshot,
        type: EnumTermPolicyType
    ): Promise<void> {
        const userId = snapshot.actorUserId;
        try {
            await this.outboxService.withTransaction(async tx => {
                const [latest] =
                    await this.termPolicyRepository.findLatestPublishedByTypesInTx(
                        tx,
                        [type]
                    );
                if (!latest) {
                    throw new TermPolicyNotFoundException();
                }

                const acceptedAt = this.helperDateService.create();
                await this.termPolicyRepository.acceptInTx(
                    tx,
                    userId,
                    latest.id,
                    userId,
                    acceptedAt
                );

                const effect = this.notificationService.notify(
                    EnumNotificationKind.userAcceptTermPolicy,
                    {
                        userId,
                        proceedBy: userId,
                        termPolicyId: latest.id,
                        type: latest.type,
                        version: latest.version,
                    }
                );
                await this.outboxService.addInTx(tx, effect);

                const entry = this.activityLogService.recordEffect(snapshot, {
                    action: EnumActivityLogAction.userAcceptTermPolicy,
                });
                await this.outboxService.addInTx(tx, entry);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isDuplicate = this.databaseUtil.isUniqueCollision(
                err,
                'termPolicyId'
            );
            const mapped = this.databaseUtil.toException(err);
            if (
                isDuplicate ||
                mapped instanceof DatabaseWriteConflictException
            ) {
                throw new TermPolicyAlreadyAcceptedException();
            }

            throw new AppUnknownException(err);
        }
    }
}
