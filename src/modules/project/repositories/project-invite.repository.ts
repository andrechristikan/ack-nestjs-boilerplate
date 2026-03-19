import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumProjectInviteStatus,
    Prisma,
    ProjectInvite,
} from '@generated/prisma-client';

@Injectable()
export class ProjectInviteRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findOneById(id: string): Promise<ProjectInvite | null> {
        return this.databaseService.projectInvite.findFirst({ where: { id } });
    }

    async findOneByIdAndProject(
        id: string,
        projectId: string
    ): Promise<ProjectInvite | null> {
        return this.databaseService.projectInvite.findFirst({
            where: { id, projectId },
        });
    }

    async findOneByToken(token: string): Promise<ProjectInvite | null> {
        return this.databaseService.projectInvite.findFirst({ where: { token } });
    }

    async findOneActiveByToken(token: string): Promise<ProjectInvite | null> {
        const now = this.helperService.dateCreate();
        return this.databaseService.projectInvite.findFirst({
            where: {
                token,
                status: EnumProjectInviteStatus.pending,
                expiresAt: { gt: now },
            },
        });
    }

    async findOnePendingByEmailAndProject(
        invitedEmail: string,
        projectId: string
    ): Promise<ProjectInvite | null> {
        return this.databaseService.projectInvite.findFirst({
            where: {
                invitedEmail,
                projectId,
                status: EnumProjectInviteStatus.pending,
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async create(
        data: Prisma.ProjectInviteUncheckedCreateInput,
        requestLog: IRequestLog
    ): Promise<ProjectInvite> {
        const createdBy = data.createdBy as string;

        return this.databaseService.$transaction(async tx => {
            const invite = await tx.projectInvite.create({ data });

            await tx.user.update({
                where: { id: createdBy, deletedAt: null },
                data: {
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userCreateProjectInvite,
                            ipAddress: requestLog.ipAddress,
                            userAgent: this.databaseUtil.toPlainObject(
                                requestLog.userAgent
                            ),
                            createdBy,
                        },
                    },
                },
            });

            return invite;
        });
    }

    async revoke(
        inviteId: string,
        revokedById: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const now = this.helperService.dateCreate();

        await this.databaseService.$transaction([
            this.databaseService.projectInvite.update({
                where: { id: inviteId, status: EnumProjectInviteStatus.pending },
                data: {
                    status: EnumProjectInviteStatus.revoked,
                    revokedAt: now,
                    revokedById,
                    updatedBy: revokedById,
                },
            }),
            this.databaseService.user.update({
                where: { id: revokedById, deletedAt: null },
                data: {
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userRevokeProjectInvite,
                            ipAddress: requestLog.ipAddress,
                            userAgent: this.databaseUtil.toPlainObject(
                                requestLog.userAgent
                            ),
                            createdBy: revokedById,
                        },
                    },
                },
            }),
        ]);
    }

    async markSent(inviteId: string, updatedBy: string): Promise<Date> {
        const sentAt = this.helperService.dateCreate();
        await this.databaseService.projectInvite.update({
            where: { id: inviteId },
            data: { sentAt, updatedBy },
        });

        return sentAt;
    }

    async accept(
        inviteId: string,
        acceptedById: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const now = this.helperService.dateCreate();

        await this.databaseService.$transaction(async tx => {
            await tx.projectInvite.update({
                where: { id: inviteId },
                data: {
                    status: EnumProjectInviteStatus.accepted,
                    acceptedAt: now,
                    updatedBy: acceptedById,
                },
            });

            await tx.user.update({
                where: { id: acceptedById, deletedAt: null },
                data: {
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userAcceptProjectInvite,
                            ipAddress: requestLog.ipAddress,
                            userAgent: this.databaseUtil.toPlainObject(
                                requestLog.userAgent
                            ),
                            createdBy: acceptedById,
                        },
                    },
                },
            });
        });
    }

    async findWithPaginationOffset(
        projectId: string,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<
            Prisma.ProjectInviteSelect,
            Prisma.ProjectInviteWhereInput
        >
    ): Promise<IResponsePagingReturn<ProjectInvite>> {
        return this.paginationService.offset<ProjectInvite>(
            this.databaseService.projectInvite,
            {
                ...params,
                where: {
                    ...where,
                    projectId,
                },
            }
        );
    }
}
