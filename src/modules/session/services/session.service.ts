import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import { Duration } from 'luxon';
import { Document } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { SessionCreateRequestDto } from 'src/modules/session/dtos/request/session.create.request.dto';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import {
    ENUM_SESSION_PROCESS,
    ENUM_SESSION_STATUS,
} from 'src/modules/session/enums/session.enum';
import { ISessionService } from 'src/modules/session/interfaces/session.service.interface';
import {
    SessionDoc,
    SessionEntity,
} from 'src/modules/session/repository/entities/session.entity';
import { SessionRepository } from 'src/modules/session/repository/repositories/session.repository';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@Injectable()
export class SessionService implements ISessionService {
    private readonly refreshTokenExpiration: number;
    private readonly appName: string;

    private readonly sessionKeyPrefix: string;

    constructor(
        @InjectQueue(ENUM_WORKER_QUEUES.SESSION_QUEUE)
        private readonly sessionQueue: Queue,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly sessionRepository: SessionRepository
    ) {
        this.refreshTokenExpiration = this.configService.get<number>(
            'auth.jwt.refreshToken.expirationTime'
        )!;
        this.appName = this.configService.get<string>('app.name')!;

        this.sessionKeyPrefix =
            this.configService.get<string>('session.keyPrefix')!;
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
        options?: IDatabaseFindOneOptions
    ): Promise<SessionDoc> {
        return this.sessionRepository.findOneById<SessionDoc>(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<SessionDoc> {
        return this.sessionRepository.findOne<SessionDoc>(find, options);
    }

    async findOneActiveById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SessionDoc> {
        const today = this.helperDateService.create();

        return this.sessionRepository.findOne<SessionDoc>(
            {
                _id,
                expiredAt: {
                    $gte: today,
                },
            },
            options
        );
    }

    async findOneActiveByIdAndUser(
        _id: string,
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<SessionDoc> {
        const today = this.helperDateService.create();

        return this.sessionRepository.findOne<SessionDoc>(
            {
                _id,
                user,
                expiredAt: {
                    $gte: today,
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
        const today = this.helperDateService.create();
        const expiredAt: Date = this.helperDateService.forward(
            today,
            Duration.fromObject({
                seconds: this.refreshTokenExpiration,
            })
        );

        const create = new SessionEntity();
        create.user = user;
        create.hostname = request.hostname;
        create.ip = request.ip ?? '0.0.0.0';
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

    mapList(
        userLogins: SessionDoc[] | SessionEntity[]
    ): SessionListResponseDto[] {
        return plainToInstance(
            SessionListResponseDto,
            userLogins.map((e: SessionDoc | SessionEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }

    async findLoginSession(_id: string): Promise<string> {
        return (await this.cacheManager.get<string>(
            `${this.appName}:${this.sessionKeyPrefix}:${_id}`
        ))!;
    }

    async setLoginSession(user: IUserDoc, session: SessionDoc): Promise<void> {
        const key = `${this.appName}:${this.sessionKeyPrefix}:${session._id}`;

        await this.cacheManager.set(
            key,
            { user: user._id },
            this.refreshTokenExpiration
        );

        await this.sessionQueue.add(
            ENUM_SESSION_PROCESS.REVOKE,
            {
                session: session._id,
            },
            {
                jobId: key,
                timestamp: session.createdAt.valueOf(),
                delay: this.refreshTokenExpiration * 1000,
            }
        );

        return;
    }

    async deleteLoginSession(_id: string): Promise<void> {
        const key = `${this.appName}:${this.sessionKeyPrefix}:${_id}`;
        await this.cacheManager.del(key);

        await this.sessionQueue.remove(key);

        return;
    }

    async resetLoginSession(): Promise<void> {
        await this.cacheManager.clear();

        return;
    }

    async updateRevoke(
        repository: SessionDoc,
        options?: IDatabaseOptions
    ): Promise<SessionDoc> {
        await this.deleteLoginSession(repository._id);

        repository.status = ENUM_SESSION_STATUS.REVOKED;
        repository.revokeAt = this.helperDateService.create();

        return this.sessionRepository.save(repository, options);
    }

    async updateManyRevokeByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<boolean> {
        const today = this.helperDateService.create();
        const sessions = await this.findAllByUser(user, undefined, options);
        const promises = sessions.map(e => this.deleteLoginSession(e._id));

        await Promise.all(promises);

        await this.sessionRepository.updateMany(
            {
                user,
            },
            {
                status: ENUM_SESSION_STATUS.REVOKED,
                revokeAt: today,
            },
            options
        );

        return true;
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.sessionRepository.deleteMany(find, options);

        return true;
    }
}
