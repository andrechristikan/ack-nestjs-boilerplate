import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import {
    ITermPolicyContent,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { ITermPolicyRepository } from '@modules/term-policy/interfaces/term-policy.repository.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
    TermPolicy,
} from '@generated/prisma-client';

@Injectable()
export class TermPolicyRepository implements ITermPolicyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async find(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicy>> {
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
    ): Promise<IResponsePagingReturn<TermPolicy>> {
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
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>> {
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

    async findOneById(termPolicyId: string): Promise<TermPolicy | null> {
        return this.databaseService.client.termPolicy.findUnique({
            where: {
                id: termPolicyId,
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
        { type, version }: TermPolicyCreateRequestDto,
        contents: ITermPolicyContent[],
        createdBy: string
    ): Promise<TermPolicy> {
        return this.databaseService.client.termPolicy.create({
            data: {
                type,
                version,
                status: EnumTermPolicyStatus.draft,
                contents: this.databaseUtil.toPlainArray(contents),
                createdBy,
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
        content: ITermPolicyContent,
        updatedBy: string
    ): Promise<TermPolicy> {
        const contentIndex = contents.findIndex(
            c => c.language === content.language
        );
        if (contentIndex !== -1) {
            contents[contentIndex] = content;
        }

        return this.databaseService.client.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: this.databaseUtil.toPlainArray(contents),
                updatedBy,
            },
        });
    }

    async addContent(
        termPolicyId: string,
        newContent: ITermPolicyContent,
        updatedBy: string
    ): Promise<TermPolicy> {
        return this.databaseService.client.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: {
                    push: this.databaseUtil.toPlainObject<
                        ITermPolicyContent,
                        Prisma.TermPolicyContentCreateInput
                    >(newContent),
                },
                updatedBy,
            },
        });
    }

    async removeContent(
        termPolicyId: string,
        contents: ITermPolicyContent[],
        { language }: TermPolicyRemoveContentRequestDto,
        updatedBy: string
    ): Promise<TermPolicy> {
        const contentIndex = contents.findIndex(c => c.language === language);
        if (contentIndex !== -1) {
            contents.splice(contentIndex, 1);
        }

        return this.databaseService.client.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: this.databaseUtil.toPlainArray(contents),
                updatedBy,
            },
        });
    }

    async publishInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContent[],
        updatedBy: string
    ): Promise<TermPolicy> {
        return tx.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                status: EnumTermPolicyStatus.published,
                publishedAt: this.helperDateService.create(),
                contents,
                updatedBy,
            },
        });
    }
}
