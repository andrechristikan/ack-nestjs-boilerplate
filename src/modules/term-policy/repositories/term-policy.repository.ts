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
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import type {
    ITermPolicy,
    ITermPolicyContentCreate,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
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
        private readonly helperDateService: HelperDateService
    ) {}

    async find(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
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
        type?: Record<string, IPaginationIn>
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
        });
    }

    async findOneById(termPolicyId: string): Promise<ITermPolicy | null> {
        return this.databaseService.client.termPolicy.findUnique({
            where: {
                id: termPolicyId,
            },
            include: {
                contents: true,
            },
        });
    }

    async findLatestPublishedByType(type: EnumTermPolicyType): Promise<{
        id: string;
        type: EnumTermPolicyType;
        version: number;
    } | null> {
        return this.databaseService.client.termPolicy.findFirst({
            where: {
                type,
                status: EnumTermPolicyStatus.published,
            },
            orderBy: {
                version: Prisma.SortOrder.desc,
            },
            select: {
                id: true,
                type: true,
                version: true,
            },
        });
    }

    async existsAcceptanceByPolicyAndUser(
        userId: string,
        termPolicyId: string
    ): Promise<boolean> {
        const count =
            await this.databaseService.client.termPolicyUserAcceptance.count({
                where: {
                    userId,
                    termPolicyId,
                },
            });

        return count > 0;
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

    async findPublishedByTypesInTx(
        tx: IDatabaseTransactionClient,
        types: EnumTermPolicyType[]
    ): Promise<{ id: string; type: EnumTermPolicyType }[]> {
        return tx.termPolicy.findMany({
            where: {
                type: { in: types },
                status: EnumTermPolicyStatus.published,
            },
            select: {
                id: true,
                type: true,
            },
        });
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
            include: {
                termPolicy: true,
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async create(
        termPolicyId: string,
        { type, version }: TermPolicyCreateRequestDto,
        contents: ITermPolicyContentCreate[]
    ): Promise<TermPolicy> {
        return this.databaseService.client.termPolicy.create({
            data: {
                id: termPolicyId,
                type,
                version,
                status: EnumTermPolicyStatus.draft,
                contents: {
                    createMany: {
                        data: contents,
                    },
                },
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
        content: ITermPolicyContentCreate
    ): Promise<TermPolicy> {
        return this.databaseService.client.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: {
                    update: {
                        where: {
                            termPolicyId_language: {
                                termPolicyId,
                                language: content.language,
                            },
                        },
                        data: content,
                    },
                },
            },
        });
    }

    async addContent(
        termPolicyId: string,
        newContent: ITermPolicyContentCreate
    ): Promise<TermPolicy> {
        return this.databaseService.client.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: {
                    create: newContent,
                },
            },
        });
    }

    async removeContent(
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto
    ): Promise<TermPolicy> {
        return this.databaseService.client.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: {
                    delete: {
                        termPolicyId_language: {
                            termPolicyId,
                            language,
                        },
                    },
                },
            },
        });
    }

    async publishInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContentCreate[]
    ): Promise<TermPolicy> {
        const publishedAt = this.helperDateService.create();

        return tx.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                status: EnumTermPolicyStatus.published,
                publishedAt,
                contents: {
                    deleteMany: {},
                    createMany: {
                        data: contents,
                    },
                },
            },
        });
    }
}
