import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
    TermPolicyRefSelect,
    TermPolicyUserAcceptanceRefSelect,
} from '@modules/term-policy/constants/term-policy.constant';
import type {
    ITermPolicyAcceptanceRow,
    ITermPolicyContent,
    ITermPolicyRef,
    ITermPolicyRefAcceptance,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import type { ITermPolicyRepository } from '@modules/term-policy/interfaces/term-policy.repository.interface';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
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
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private pickLatestPerType<T extends ITermPolicyRef>(rows: T[]): T[] {
        const latest = new Map<EnumTermPolicyType, T>();
        for (const row of rows) {
            if (!latest.has(row.type)) {
                latest.set(row.type, row);
            }
        }

        return [...latest.values()];
    }

    private refWithAcceptanceSelect(
        userId: string
    ): typeof TermPolicyRefSelect & {
        userAcceptances: {
            where: Prisma.TermPolicyUserAcceptanceWhereInput;
            select: typeof TermPolicyUserAcceptanceRefSelect;
            take: 1;
        };
    } {
        return {
            ...TermPolicyRefSelect,
            userAcceptances: {
                where: { userId },
                select: TermPolicyUserAcceptanceRefSelect,
                take: 1,
            },
        };
    }

    async find(
        { where, ...others }: IPaginationQueryOffsetParams,
        type: Record<string, IPaginationIn> | null,
        status: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        return this.paginationService.offset(
            this.databaseService.client.termPolicy,
            {
                ...others,
                where: {
                    ...where,
                    ...type,
                    ...status,
                },
            }
        );
    }

    async findPublished(
        { where, ...others }: IPaginationQueryCursorParams,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<TermPolicy>> {
        return this.paginationService.cursor(
            this.databaseService.client.termPolicy,
            {
                ...others,
                where: {
                    ...where,
                    ...type,
                    status: EnumTermPolicyStatus.published,
                },
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

    async findOneById(termPolicyId: string): Promise<TermPolicy | null> {
        return this.databaseService.client.termPolicy.findUnique({
            where: {
                id: termPolicyId,
            },
        });
    }

    async findLatestPublishedWithAcceptanceByUser(
        types: EnumTermPolicyType[],
        userId: string
    ): Promise<ITermPolicyRefAcceptance[]> {
        const select = this.refWithAcceptanceSelect(userId);
        const rows = await this.databaseService.client.termPolicy.findMany({
            where: {
                type: { in: types },
                status: EnumTermPolicyStatus.published,
            },
            orderBy: { version: Prisma.SortOrder.desc },
            select,
        });

        return this.pickLatestPerType(rows);
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
                select: TermPolicyRefSelect,
            });

        return termPolicy?.status ?? null;
    }

    async acceptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        termPolicyId: string,
        createdBy: string,
        acceptedAt: Date
    ): Promise<void> {
        try {
            await tx.termPolicyUserAcceptance.create({
                data: {
                    acceptedAt,
                    userId,
                    termPolicyId,
                    createdBy,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toUniqueException(
                error,
                [
                    {
                        field: Prisma.TermPolicyUserAcceptanceScalarFieldEnum
                            .termPolicyId,
                        exception: new TermPolicyAlreadyAcceptedException(),
                    },
                ],
                new AppUnknownException(error)
            );
        }
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
    ): Promise<TermPolicy> {
        const plainContents: Prisma.TermPolicyContentCreateInput[] =
            this.databaseUtil.toPlainArray(contents);

        try {
            return await tx.termPolicy.create({
                data: {
                    id: termPolicyId,
                    type,
                    version,
                    status: EnumTermPolicyStatus.draft,
                    contents: plainContents,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toUniqueException(
                error,
                [
                    {
                        field: Prisma.TermPolicyScalarFieldEnum.version,
                        exception: new TermPolicyExistException(),
                    },
                ],
                new AppUnknownException(error)
            );
        }
    }

    async deleteDraftInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string
    ): Promise<TermPolicy> {
        try {
            return await tx.termPolicy.delete({
                where: {
                    id: termPolicyId,
                    status: EnumTermPolicyStatus.draft,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new TermPolicyStatusInvalidException()
            );
        }
    }

    async updateContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContent[],
        content: ITermPolicyContent,
        expectedUpdatedAt: Date
    ): Promise<TermPolicy> {
        const contentIndex = contents.findIndex(
            c => c.language === content.language
        );
        if (contentIndex !== -1) {
            contents[contentIndex] = content;
        }

        const plainContents: Prisma.TermPolicyContentCreateInput[] =
            this.databaseUtil.toPlainArray(contents);

        try {
            return await tx.termPolicy.update({
                where: {
                    id: termPolicyId,
                    status: EnumTermPolicyStatus.draft,
                    updatedAt: expectedUpdatedAt,
                },
                data: {
                    contents: plainContents,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new TermPolicyStatusInvalidException()
            );
        }
    }

    async addContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        newContent: ITermPolicyContent
    ): Promise<TermPolicy> {
        const plainContent = this.databaseUtil.toPlainObject<
            ITermPolicyContent,
            Prisma.TermPolicyContentCreateInput
        >(newContent);

        try {
            return await tx.termPolicy.update({
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
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new TermPolicyStatusInvalidException()
            );
        }
    }

    async removeContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContent[],
        language: EnumMessageLanguage,
        expectedUpdatedAt: Date
    ): Promise<TermPolicy> {
        const contentIndex = contents.findIndex(c => c.language === language);
        if (contentIndex !== -1) {
            contents.splice(contentIndex, 1);
        }

        const plainContents: Prisma.TermPolicyContentCreateInput[] =
            this.databaseUtil.toPlainArray(contents);

        try {
            return await tx.termPolicy.update({
                where: {
                    id: termPolicyId,
                    status: EnumTermPolicyStatus.draft,
                    updatedAt: expectedUpdatedAt,
                },
                data: {
                    contents: plainContents,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new TermPolicyStatusInvalidException()
            );
        }
    }

    async publishInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContent[],
        publishedAt: Date
    ): Promise<TermPolicy> {
        try {
            return await tx.termPolicy.update({
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
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new TermPolicyStatusInvalidException()
            );
        }
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

    async existsNewerPublished(
        type: EnumTermPolicyType,
        version: number
    ): Promise<boolean> {
        const count = await this.databaseService.client.termPolicy.count({
            where: {
                type,
                status: EnumTermPolicyStatus.published,
                version: { gt: version },
            },
        });

        return count > 0;
    }
}
