import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
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
import { TermPolicyAcceptedColumnMap } from '@modules/term-policy/constants/term-policy.constant';
import {
    ITermPolicy,
    ITermPolicyContentCreate,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    EnumUserStatus,
    Prisma,
    TermPolicy,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';

@Injectable()
export class TermPolicyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil
    ) {}

    async find(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ITermPolicy>> {
        return this.paginationService.offset<
            ITermPolicy,
            Prisma.TermPolicyWhereInput
        >(this.databaseService.client.termPolicy, {
            ...others,
            where: {
                ...where,
                ...type,
                ...status,
            },
            include: {
                contents: true,
            },
        });
    }

    async findPublished(
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ITermPolicy>> {
        return this.paginationService.cursor<
            ITermPolicy,
            Prisma.TermPolicyWhereInput
        >(this.databaseService.client.termPolicy, {
            ...others,
            where: {
                ...where,
                ...type,
                status: EnumTermPolicyStatus.published,
            },
            include: {
                contents: true,
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

    async existLatestPublishedByType(type: EnumTermPolicyType): Promise<{
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

    async existAcceptanceByPolicyAndUser(
        userId: string,
        termPolicyId: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.client.termPolicyUserAcceptance.findFirst({
            where: {
                userId,
                termPolicyId,
            },
            select: {
                id: true,
            },
        });
    }

    async existByVersionAndType(
        version: number,
        type: EnumTermPolicyType
    ): Promise<Pick<TermPolicy, 'id' | 'status'> | null> {
        return this.databaseService.client.termPolicy.findFirst({
            where: {
                version,
                type,
            },
            select: {
                id: true,
                status: true,
            },
        });
    }

    async accept(
        user: IUser,
        termPolicyId: string,
        type: EnumTermPolicyType,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<ITermPolicyUserAcceptance> {
        const acceptedAt = this.helperDateService.create();
        const [userAcceptance] = await this.databaseService.client.$transaction(
            [
                this.databaseService.client.termPolicyUserAcceptance.create({
                    data: {
                        acceptedAt,
                        userId: user.id,
                        termPolicyId,
                        createdBy: user.id,
                    },
                    include: {
                        termPolicy: true,
                        user: {
                            select: UserRefSelect,
                        },
                    },
                }),
                this.databaseService.client.user.update({
                    where: {
                        id: user.id,
                        deletedAt: null,
                        status: EnumUserStatus.active,
                    },
                    data: {
                        [TermPolicyAcceptedColumnMap[type]]: true,
                        activityLogs: {
                            create: {
                                action: EnumActivityLogAction.userAcceptTermPolicy,
                                description:
                                    this.activityLogUtil.getDescription(
                                        EnumActivityLogAction.userAcceptTermPolicy,
                                        {
                                            type,
                                        }
                                    ),
                                ipAddress,
                                userAgent:
                                    this.databaseUtil.toPlainObject(userAgent),
                                geoLocation:
                                    this.databaseUtil.toPlainObject(
                                        geoLocation
                                    ),
                                createdBy: user.id,
                                metadata: {
                                    termPolicyType: type,
                                },
                            },
                        },
                    },
                }),
            ]
        );

        return userAcceptance;
    }

    async create(
        { type, version }: TermPolicyCreateRequestDto,
        contents: ITermPolicyContentCreate[],
        createdBy: string
    ): Promise<ITermPolicy> {
        return this.databaseService.client.termPolicy.create({
            data: {
                type,
                version,
                status: EnumTermPolicyStatus.draft,
                contents: {
                    createMany: {
                        data: contents,
                    },
                },
                createdBy,
            },
            include: {
                contents: true,
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
        content: ITermPolicyContentCreate,
        updatedBy: string
    ): Promise<TermPolicy> {
        const [, termPolicy] = await this.databaseService.client.$transaction([
            this.databaseService.client.termPolicyContent.update({
                where: {
                    termPolicyId_language: {
                        termPolicyId,
                        language: content.language,
                    },
                },
                data: content,
            }),
            this.databaseService.client.termPolicy.update({
                where: {
                    id: termPolicyId,
                },
                data: {
                    updatedBy,
                },
            }),
        ]);

        return termPolicy;
    }

    async addContent(
        termPolicyId: string,
        newContent: ITermPolicyContentCreate,
        updatedBy: string
    ): Promise<TermPolicy> {
        return this.databaseService.client.termPolicy.update({
            where: {
                id: termPolicyId,
            },
            data: {
                contents: {
                    create: newContent,
                },
                updatedBy,
            },
        });
    }

    async removeContent(
        termPolicyId: string,
        { language }: TermPolicyRemoveContentRequestDto,
        updatedBy: string
    ): Promise<TermPolicy> {
        const [, termPolicy] = await this.databaseService.client.$transaction([
            this.databaseService.client.termPolicyContent.delete({
                where: {
                    termPolicyId_language: {
                        termPolicyId,
                        language,
                    },
                },
            }),
            this.databaseService.client.termPolicy.update({
                where: {
                    id: termPolicyId,
                },
                data: {
                    updatedBy,
                },
            }),
        ]);

        return termPolicy;
    }

    async publish(
        termPolicyId: string,
        type: EnumTermPolicyType,
        contents: ITermPolicyContentCreate[],
        updatedBy: string
    ): Promise<TermPolicy> {
        const [termPolicy] = await this.databaseService.client.$transaction([
            this.databaseService.client.termPolicy.update({
                where: {
                    id: termPolicyId,
                },
                data: {
                    status: EnumTermPolicyStatus.published,
                    publishedAt: this.helperDateService.create(),
                    contents: this.databaseUtil.replaceMany(contents),
                    updatedBy,
                },
            }),
            this.databaseService.client.user.updateMany({
                where: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
                data: {
                    [TermPolicyAcceptedColumnMap[type]]: false,
                },
            }),
        ]);

        return termPolicy;
    }
}
