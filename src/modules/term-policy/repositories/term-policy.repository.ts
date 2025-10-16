import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { Injectable } from '@nestjs/common';
import {
    ENUM_ACTIVITY_LOG_ACTION,
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
    Prisma,
    TermPolicy,
} from '@prisma/client';

@Injectable()
export class TermPolicyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

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
                    status: ENUM_TERM_POLICY_STATUS.PUBLISHED,
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

    async existLatestPublishedByType(type: ENUM_TERM_POLICY_TYPE): Promise<{
        id: string;
    } | null> {
        return this.databaseService.termPolicy.findFirst({
            where: {
                type,
                status: ENUM_TERM_POLICY_STATUS.PUBLISHED,
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

    async accept(
        userId: string,
        termPolicyId: string,
        type: ENUM_TERM_POLICY_TYPE,
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
                },
                data: {
                    termPolicy: {
                        [type]: true,
                    },
                    activityLogs: {
                        create: {
                            action: ENUM_ACTIVITY_LOG_ACTION.USER_ACCEPT_TERM_POLICY,
                            ipAddress,
                            userAgent: JSON.stringify(
                                userAgent
                            ) as Prisma.InputJsonValue,
                            createdBy: userId,
                        },
                    },
                },
            }),
        ]);

        return userAcceptance;
    }
}
