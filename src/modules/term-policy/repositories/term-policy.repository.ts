import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermContentDto } from '@modules/term-policy/dtos/term-policy.content.dto';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    EnumUserStatus,
    Prisma,
    TermPolicy,
} from '@prisma/client';

@Injectable()
export class TermPolicyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

    async find(
        { where, ...others }: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicy>> {
        return this.paginationService.offset<TermPolicy>(
            this.databaseService.termPolicy,
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
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicy>> {
        return this.paginationService.cursor<TermPolicy>(
            this.databaseService.termPolicy,
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
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>> {
        return this.paginationService.cursor<ITermPolicyUserAcceptance>(
            this.databaseService.termPolicyUserAcceptance,
            {
                ...others,
                where: {
                    userId,
                    ...where,
                },
            }
        );
    }

    async findOneById(termPolicyId: string): Promise<TermPolicy | null> {
        return this.databaseService.termPolicy.findUnique({
            where: {
                id: termPolicyId,
            },
        });
    }

    async existLatestPublishedByType(type: EnumTermPolicyType): Promise<{
        id: string;
    } | null> {
        return this.databaseService.termPolicy.findFirst({
            where: {
                type,
                status: EnumTermPolicyStatus.published,
            },
            orderBy: {
                version: Prisma.SortOrder.desc,
            },
        });
    }

    async existAcceptanceByPolicyAndUser(
        userId: string,
        termPolicyId: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.termPolicyUserAcceptance.findFirst({
            where: {
                userId,
                termPolicyId,
            },
        });
    }

    async existByVersionAndType(
        version: number,
        type: EnumTermPolicyType
    ): Promise<{
        id: string;
        contents: Prisma.JsonArray;
        status: EnumTermPolicyStatus;
    } | null> {
        return this.databaseService.termPolicy.findFirst({
            where: {
                version,
                type,
            },
            select: {
                id: true,
                contents: true,
                status: true,
            },
        });
    }

    async accept(
        userId: string,
        termPolicyId: string,
        type: EnumTermPolicyType,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<ITermPolicyUserAcceptance> {
        const acceptedAt = this.helperService.dateCreate();
        const [userAcceptance] = await this.databaseService.$transaction([
            this.databaseService.termPolicyUserAcceptance.create({
                data: {
                    acceptedAt,
                    userId,
                    termPolicyId,
                },
                include: {
                    termPolicy: true,
                    user: true,
                },
            }),
            this.databaseService.user.update({
                where: {
                    id: userId,
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
                data: {
                    termPolicy: {
                        [type]: true,
                    },
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userAcceptTermPolicy,
                            ipAddress,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            createdBy: userId,
                            metadata: {
                                termPolicyType: type,
                            },
                        },
                    },
                },
            }),
        ]);

        return userAcceptance;
    }

    async create(
        { type, version }: TermPolicyCreateRequestDto,
        contents: TermContentDto[],
        createdBy: string
    ): Promise<TermPolicy> {
        return this.databaseService.termPolicy.create({
            data: {
                type,
                version,
                status: EnumTermPolicyStatus.draft,
                contents: contents as unknown as Prisma.InputJsonArray[],
                createdBy,
            },
        });
    }

    async delete(termPolicyId: string): Promise<TermPolicy> {
        return this.databaseService.termPolicy.delete({
            where: {
                id: termPolicyId,
            },
        });
    }

    async updateContent(
        termPolicyId: string,
        contents: TermContentDto[],
        content: TermContentDto,
        updatedBy: string
    ): Promise<TermPolicy> {
        const contentIndex = contents.findIndex(
            c => c.language === content.language
        );
        if (contentIndex !== -1) {
            contents[contentIndex] = content;
        }

        return this.databaseService.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: contents as unknown as Prisma.InputJsonArray[],
                updatedBy,
            },
        });
    }

    async addContent(
        termPolicyId: string,
        content: TermContentDto,
        updatedBy: string
    ): Promise<TermPolicy> {
        return this.databaseService.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: {
                    push: content as unknown as Prisma.InputJsonValue,
                },
                updatedBy,
            },
        });
    }

    async removeContent(
        termPolicyId: string,
        contents: TermContentDto[],
        { language }: TermPolicyRemoveContentRequestDto,
        updatedBy: string
    ): Promise<TermPolicy> {
        const contentIndex = contents.findIndex(c => c.language === language);
        if (contentIndex !== -1) {
            contents.splice(contentIndex, 1);
        }

        return this.databaseService.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: contents as unknown as Prisma.InputJsonArray[],
                updatedBy,
            },
        });
    }

    async publish(
        termPolicyId: string,
        type: EnumTermPolicyType,
        contents: TermContentDto[],
        updatedBy: string
    ): Promise<TermPolicy> {
        const [termPolicy] = await this.databaseService.$transaction([
            this.databaseService.termPolicy.update({
                where: {
                    id: termPolicyId,
                },
                data: {
                    status: EnumTermPolicyStatus.published,
                    publishedAt: this.helperService.dateCreate(),
                    contents: contents as unknown as Prisma.InputJsonArray[],
                    updatedBy,
                },
            }),
            this.databaseService.user.updateMany({
                where: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
                data: {
                    termPolicy: {
                        [type]: false,
                    },
                },
            }),
        ]);

        return termPolicy;
    }
}
