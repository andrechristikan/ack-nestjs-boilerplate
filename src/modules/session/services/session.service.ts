import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { ENUM_SESSION_STATUS_CODE_ERROR } from '@modules/session/enums/session.status-code.enum';
import { ISessionService } from '@modules/session/interfaces/session.service.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class SessionService implements ISessionService {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly sessionUtil: SessionUtil
    ) {}

    async getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        const { data, ...others } =
            await this.sessionRepository.findWithPaginationOffsetByUser(
                userId,
                pagination
            );

        const sessions: SessionResponseDto[] = this.sessionUtil.mapList(data);
        return {
            data: sessions,
            ...others,
        };
    }

    async getListCursorByUser(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        const { data, ...others } =
            await this.sessionRepository.findWithPaginationCursorByUser(
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
    ): Promise<IResponseReturn<void>> {
        const checkActive = await this.sessionRepository.findOneActiveByUser(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new NotFoundException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.notFound,
                message: 'session.error.notFound',
            });
        }

        await Promise.all([
            this.sessionRepository.revokeByUser(userId, sessionId, requestLog),
            this.sessionUtil.deleteOneLogin(userId, sessionId),
        ]);

        return;
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        requestLog: IRequestLog,
        revokeBy: string
    ): Promise<IResponseReturn<void>> {
        const checkActive = await this.sessionRepository.findOneActiveByUser(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new NotFoundException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.notFound,
                message: 'session.error.notFound',
            });
        }

        const [updated] = await Promise.all([
            this.sessionRepository.revokeByAdmin(
                sessionId,
                requestLog,
                revokeBy
            ),
            this.sessionUtil.deleteOneLogin(userId, sessionId),
        ]);

        return {
            metadataActivityLog:
                this.sessionUtil.mapActivityLogMetadata(updated),
        };
    }
}
