import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { ISessionService } from '@modules/session/interfaces/session.service.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

@Injectable()
export class SessionService implements ISessionService {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly sessionUtil: SessionUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        const { data, ...others } =
            await this.sessionRepository.findWithPaginationOffsetByAdmin(
                userId,
                pagination,
                isRevoked
            );

        const sessions: SessionResponseDto[] = this.sessionUtil.mapList(data);
        return {
            data: sessions,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.SessionSelect,
            Prisma.SessionWhereInput
        >
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        const { data, ...others } =
            await this.sessionRepository.findActiveWithPaginationCursor(
                userId,
                pagination
            );

        const sessions: SessionResponseDto[] = this.sessionUtil.mapList(data);

        return {
            data: sessions,
            ...others,
        };
    }

    async revoke(
        userId: string,
        sessionId: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new NotFoundException({
                statusCode: EnumSessionStatusCodeError.notFound,
                message: 'session.error.notFound',
            });
        }

        await Promise.all([
            this.sessionRepository.revoke(userId, sessionId, requestLog),
            this.sessionUtil.deleteOneLogin(userId, sessionId),
        ]);

        return;
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        requestLog: IRequestLog,
        revokedBy: string
    ): Promise<IResponseReturn<void>> {
        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new NotFoundException({
                statusCode: EnumSessionStatusCodeError.notFound,
                message: 'session.error.notFound',
            });
        }

        const [removed] = await Promise.all([
            this.sessionRepository.revokeByAdmin(
                sessionId,
                requestLog,
                revokedBy
            ),
            this.sessionUtil.deleteOneLogin(userId, sessionId),
        ]);

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.sessionUtil.mapActivityLogMetadata(removed)
        );

        return {};
    }
}
