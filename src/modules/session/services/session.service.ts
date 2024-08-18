import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import { Document } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { SessionLoginPrefix } from 'src/modules/session/constants/session.constant';
import { SessionCreateRequestDto } from 'src/modules/session/dtos/request/session.create.request.dto';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';
import { ISessionService } from 'src/modules/session/interfaces/session.service.interface';
import {
    SessionDoc,
    SessionEntity,
} from 'src/modules/session/repository/entities/session.entity';
import { SessionRepository } from 'src/modules/session/repository/repositories/session.repository';

@Injectable()
export class SessionService implements ISessionService {
    private readonly refreshTokenExpiration: number;

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly sessionRepository: SessionRepository
    ) {
        this.refreshTokenExpiration = this.configService.get<number>(
            'auth.jwt.refreshToken.expirationTime'
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SessionDoc[]> {
        return this.sessionRepository.findAll<SessionDoc>(find, options);
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SessionDoc[]> {
        return this.sessionRepository.findAll<SessionDoc>(
            { user, ...find },
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<SessionDoc> {
        return this.sessionRepository.findOneById<SessionDoc>(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<SessionDoc> {
        return this.sessionRepository.findOne<SessionDoc>(find, options);
    }

    async findOneActiveByIdAndUser(
        _id: string,
        user: string,
        options?: IDatabaseOptions
    ): Promise<SessionDoc> {
        const today = this.helperDateService.create();

        return this.sessionRepository.findOne<SessionDoc>(
            {
                _id,
                user,
                expiredAt: {
                    $lte: today,
                },
            },
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.sessionRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.sessionRepository.getTotal({ user }, options);
    }

    async create(
        request: Request,
        { user }: SessionCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<SessionDoc> {
        const expiredAt: Date = this.helperDateService.forwardInSeconds(
            this.refreshTokenExpiration
        );

        const create = new SessionEntity();
        create.user = user;
        create.hostname = request.hostname;
        create.ip = request.ip;
        create.protocol = request.protocol;
        create.originalUrl = request.originalUrl;
        create.method = request.method;

        create.userAgent = request.headers['user-agent'] as string;
        create.xForwardedFor = request.headers['x-forwarded-for'] as string;
        create.xForwardedHost = request.headers['x-forwarded-host'] as string;
        create.xForwardedPorto = request.headers['x-forwarded-porto'] as string;

        create.status = ENUM_SESSION_STATUS.ACTIVE;
        create.expiredAt = expiredAt;

        return this.sessionRepository.create<SessionEntity>(create, options);
    }

    async mapList(
        userLogins: SessionDoc[] | SessionEntity[]
    ): Promise<SessionListResponseDto[]> {
        return plainToInstance(
            SessionListResponseDto,
            userLogins.map((e: SessionDoc | SessionEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    async createLoginSession(
        _id: string,
        user: string,
        expiredIn: number
    ): Promise<void> {
        await this.cacheManager.set(
            `${SessionLoginPrefix}${_id}`,
            user,
            expiredIn * 1000
        );

        return;
    }

    async deleteLoginSession(_id: string): Promise<void> {
        await this.cacheManager.del(`${SessionLoginPrefix}${_id}`);

        return;
    }

    async updateRevoke(
        repository: SessionDoc,
        options?: IDatabaseOptions
    ): Promise<SessionDoc> {
        repository.status = ENUM_SESSION_STATUS.REVOKED;
        repository.revokeAt = this.helperDateService.create();

        return this.sessionRepository.save(repository, options);
    }
}
