import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    TermPolicyAcceptanceInclude,
    TermPolicyInclude,
    TermPolicyRefSelect,
} from '@modules/term-policy/constants/term-policy.constant';
import type {
    ITermPolicy,
    ITermPolicyAcceptanceRow,
    ITermPolicyContent,
    ITermPolicyRef,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import type { ITermPolicyRepository } from '@modules/term-policy/interfaces/term-policy.repository.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyRepository implements ITermPolicyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService
    ) {}

    private pickLatestPerType(rows: ITermPolicyRef[]): ITermPolicyRef[] {
        const latest = new Map<EnumTermPolicyType, ITermPolicyRef>();
        for (const row of rows) {
            if (!latest.has(row.type)) {
                latest.set(row.type, row);
            }
        }

        return [...latest.values()];
    }

    private async touchDraftInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string
    ): Promise<boolean> {
        const updatedAt = this.helperDateService.create();
        const { count } = await tx.termPolicy.updateMany({
            where: { id: termPolicyId, status: EnumTermPolicyStatus.draft },
            data: { updatedAt },
        });

        return count > 0;
    }

    async find(
        { where, ...others }: IPaginationQueryOffsetParams,
        type: Record<string, IPaginationIn> | null,
        status: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<ITermPolicy>> {
        return this.paginationService.offset(
            this.databaseService.client.termPolicy,
            {
                ...others,
                where: {
                    ...where,
                    ...type,
                    ...status,
                },
                include: TermPolicyInclude,
            }
        );
    }

    async findPublished(
        { where, ...others }: IPaginationQueryCursorParams,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<ITermPolicy>> {
        return this.paginationService.cursor(
            this.databaseService.client.termPolicy,
            {
                ...others,
                where: {
                    ...where,
                    ...type,
                    status: EnumTermPolicyStatus.published,
                },
                include: TermPolicyInclude,
            }
        );
    }

    async findUserAccepted(
        userId: string,
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
        return this.paginationService.cursor(
            this.databaseService.client.termPolicyUserAcceptance,
            {
                ...others,
                where: {
                    ...where,
                    userId,
                },
                include: TermPolicyAcceptanceInclude,
            }
        );
    }

    async findOneById(termPolicyId: string): Promise<ITermPolicy | null> {
        return this.databaseService.client.termPolicy.findUnique({
            where: {
                id: termPolicyId,
            },
            include: TermPolicyInclude,
        });
    }

    async findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string
    ): Promise<ITermPolicy | null> {
        return tx.termPolicy.findUnique({
            where: {
                id: termPolicyId,
            },
            include: TermPolicyInclude,
        });
    }

    async findLatestPublishedByTypes(
        types: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]> {
        const rows = await this.databaseService.client.termPolicy.findMany({
            where: {
                type: { in: types },
                status: EnumTermPolicyStatus.published,
            },
            orderBy: { version: Prisma.SortOrder.desc },
            select: TermPolicyRefSelect,
        });

        return this.pickLatestPerType(rows);
    }

    async findLatestPublishedByTypesInTx(
        tx: IDatabaseTransactionClient,
        types: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]> {
        const rows = await tx.termPolicy.findMany({
            where: {
                type: { in: types },
                status: EnumTermPolicyStatus.published,
            },
            orderBy: { version: Prisma.SortOrder.desc },
            select: TermPolicyRefSelect,
        });

        return this.pickLatestPerType(rows);
    }

    async findAcceptedTermPolicyIdsByUser(
        userId: string,
        termPolicyIds: string[]
    ): Promise<string[]> {
        const rows =
            await this.databaseService.client.termPolicyUserAcceptance.findMany(
                {
                    where: {
                        userId,
                        termPolicyId: { in: termPolicyIds },
                    },
                    select: { termPolicyId: true },
                }
            );

        return rows.map(row => row.termPolicyId);
    }

    async existsByVersionAndType(
        version: number,
        type: EnumTermPolicyType
    ): Promise<boolean> {
        const count = await this.databaseService.client.termPolicy.count({
            where: {
                version,
                type,
            },
        });

        return count > 0;
    }

    async findStatusByVersionAndType(
        version: number,
        type: EnumTermPolicyType
    ): Promise<EnumTermPolicyStatus | null> {
        const termPolicy =
            await this.databaseService.client.termPolicy.findFirst({
                where: {
                    version,
                    type,
                },
                select: {
                    status: true,
                },
            });

        return termPolicy?.status ?? null;
    }

    async acceptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        termPolicyId: string,
        createdBy: string,
        acceptedAt: Date
    ): Promise<ITermPolicyUserAcceptance> {
        return tx.termPolicyUserAcceptance.create({
            data: {
                acceptedAt,
                userId,
                termPolicyId,
                createdBy,
            },
            include: TermPolicyAcceptanceInclude,
        });
    }

    async acceptManyInTx(
        tx: IDatabaseTransactionClient,
        rows: ITermPolicyAcceptanceRow[]
    ): Promise<void> {
        await tx.termPolicyUserAcceptance.createMany({ data: rows });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        type: EnumTermPolicyType,
        version: number,
        contents: ITermPolicyContent[]
    ): Promise<ITermPolicy> {
        return tx.termPolicy.create({
            data: {
                id: termPolicyId,
                type,
                version,
                status: EnumTermPolicyStatus.draft,
                contents: { create: contents },
            },
            include: TermPolicyInclude,
        });
    }

    async deleteDraftInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string
    ): Promise<boolean> {
        const { count } = await tx.termPolicy.deleteMany({
            where: {
                id: termPolicyId,
                status: EnumTermPolicyStatus.draft,
            },
        });

        return count > 0;
    }

    async updateContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        content: ITermPolicyContent
    ): Promise<boolean> {
        const isDraft = await this.touchDraftInTx(tx, termPolicyId);
        if (!isDraft) {
            return false;
        }

        const { count } = await tx.termPolicyContent.updateMany({
            where: { termPolicyId, language: content.language },
            data: content,
        });

        return count > 0;
    }

    async addContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        newContent: ITermPolicyContent
    ): Promise<boolean> {
        const isDraft = await this.touchDraftInTx(tx, termPolicyId);
        if (!isDraft) {
            return false;
        }

        await tx.termPolicyContent.create({
            data: { termPolicyId, ...newContent },
        });

        return true;
    }

    async removeContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<boolean> {
        const isDraft = await this.touchDraftInTx(tx, termPolicyId);
        if (!isDraft) {
            return false;
        }

        const { count } = await tx.termPolicyContent.deleteMany({
            where: { termPolicyId, language },
        });

        return count > 0;
    }

    async publishInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContent[]
    ): Promise<boolean> {
        const publishedAt = this.helperDateService.create();

        const { count } = await tx.termPolicy.updateMany({
            where: {
                id: termPolicyId,
                status: EnumTermPolicyStatus.draft,
            },
            data: {
                status: EnumTermPolicyStatus.published,
                publishedAt,
            },
        });
        if (count === 0) {
            return false;
        }

        // Sequential by design: statements on one tx run in turn
        for (const content of contents) {
            await tx.termPolicyContent.updateMany({
                where: { termPolicyId, language: content.language },
                data: content,
            });
        }

        return true;
    }

    async archivePublishedByTypeInTx(
        tx: IDatabaseTransactionClient,
        type: EnumTermPolicyType,
        belowVersion: number
    ): Promise<number> {
        const { count } = await tx.termPolicy.updateMany({
            where: {
                type,
                status: EnumTermPolicyStatus.published,
                version: { lt: belowVersion },
            },
            data: {
                status: EnumTermPolicyStatus.archived,
            },
        });

        return count;
    }

    async existsNewerPublishedInTx(
        tx: IDatabaseTransactionClient,
        type: EnumTermPolicyType,
        version: number
    ): Promise<boolean> {
        const count = await tx.termPolicy.count({
            where: {
                type,
                status: EnumTermPolicyStatus.published,
                version: { gt: version },
            },
        });

        return count > 0;
    }
}
