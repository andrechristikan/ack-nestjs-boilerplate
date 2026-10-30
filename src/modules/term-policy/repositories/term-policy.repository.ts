import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import {
    TermPolicyAcceptanceInclude,
    TermPolicyRefSelect,
} from '@modules/term-policy/constants/term-policy.constant';
import type {
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
import type { TermPolicy } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyRepository implements ITermPolicyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil
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

    async find(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type: Record<string, IPaginationIn> | null,
        status: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        return this.paginationService.offset<
            TermPolicy,
            Prisma.TermPolicyWhereInput
        >(this.databaseService.client.termPolicy, {
            ...others,
            where: {
                ...where,
                ...type,
                ...status,
            },
        });
    }

    async findPublished(
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        return this.paginationService.cursor<
            TermPolicy,
            Prisma.TermPolicyWhereInput
        >(this.databaseService.client.termPolicy, {
            ...others,
            where: {
                ...where,
                ...type,
                status: EnumTermPolicyStatus.published,
            },
        });
    }

    async findUserAccepted(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
        return this.paginationService.cursor<
            ITermPolicyUserAcceptance,
            Prisma.TermPolicyUserAcceptanceWhereInput
        >(this.databaseService.client.termPolicyUserAcceptance, {
            ...others,
            where: {
                ...where,
                userId,
            },
            include: TermPolicyAcceptanceInclude,
        });
    }

    async findOneById(termPolicyId: string): Promise<TermPolicy | null> {
        return this.databaseService.client.termPolicy.findUnique({
            where: {
                id: termPolicyId,
            },
        });
    }

    async findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string
    ): Promise<TermPolicy | null> {
        return tx.termPolicy.findUnique({
            where: {
                id: termPolicyId,
            },
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

    async create(
        termPolicyId: string,
        { type, version }: TermPolicyCreateRequestDto,
        contents: ITermPolicyContent[]
    ): Promise<TermPolicy> {
        const plainContents: Prisma.TermPolicyContentCreateInput[] =
            this.databaseUtil.toPlainArray(contents);

        return this.databaseService.client.termPolicy.create({
            data: {
                id: termPolicyId,
                type,
                version,
                status: EnumTermPolicyStatus.draft,
                contents: plainContents,
            },
        });
    }

    async delete(termPolicyId: string): Promise<TermPolicy> {
        return this.databaseService.client.termPolicy.delete({
            where: {
                id: termPolicyId,
            },
        });
    }

    async updateContent(
        termPolicyId: string,
        contents: ITermPolicyContent[],
        content: ITermPolicyContent
    ): Promise<boolean> {
        const contentIndex = contents.findIndex(
            c => c.language === content.language
        );
        if (contentIndex !== -1) {
            contents[contentIndex] = content;
        }

        const plainContents: Prisma.TermPolicyContentCreateInput[] =
            this.databaseUtil.toPlainArray(contents);

        const { count } =
            await this.databaseService.client.termPolicy.updateMany({
                where: {
                    id: termPolicyId,
                    status: EnumTermPolicyStatus.draft,
                },
                data: {
                    contents: plainContents,
                },
            });

        return count > 0;
    }

    async addContent(
        termPolicyId: string,
        newContent: ITermPolicyContent
    ): Promise<boolean> {
        const plainContent = this.databaseUtil.toPlainObject<
            ITermPolicyContent,
            Prisma.TermPolicyContentCreateInput
        >(newContent);

        const { count } =
            await this.databaseService.client.termPolicy.updateMany({
                where: {
                    id: termPolicyId,
                    status: EnumTermPolicyStatus.draft,
                },
                data: {
                    contents: {
                        push: plainContent,
                    },
                },
            });

        return count > 0;
    }

    async removeContent(
        termPolicyId: string,
        contents: ITermPolicyContent[],
        { language }: TermPolicyRemoveContentRequestDto
    ): Promise<boolean> {
        const contentIndex = contents.findIndex(c => c.language === language);
        if (contentIndex !== -1) {
            contents.splice(contentIndex, 1);
        }

        const plainContents: Prisma.TermPolicyContentCreateInput[] =
            this.databaseUtil.toPlainArray(contents);

        const { count } =
            await this.databaseService.client.termPolicy.updateMany({
                where: {
                    id: termPolicyId,
                    status: EnumTermPolicyStatus.draft,
                },
                data: {
                    contents: plainContents,
                },
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
                contents,
            },
        });

        return count > 0;
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
