import { HelperService } from '@common/helper/services/helper.service';
import { SessionCacheProvider } from '@modules/session/constants/session.constant';
import { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { ISession } from '@modules/session/interfaces/session.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

@Injectable()
export class SessionUtil {
    private readonly keyPattern: string;

    constructor(
        @Inject(SessionCacheProvider) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.keyPattern = this.configService.get<string>('session.keyPattern')!;
    }

    async getLogin(userId: string, sessionId: string): Promise<boolean> {
        const key = this.keyPattern
            .replace('{userId}', userId)
            .replace('{sessionId}', sessionId);
        const cached = await this.cacheManager.get<string>(key);

        return !!cached;
    }

    async setLogin(
        userId: string,
        sessionId: string,
        expiredAt: Date
    ): Promise<void> {
        const key = this.keyPattern
            .replace('{userId}', userId)
            .replace('{sessionId}', sessionId);
        const ttl = Math.floor(
            expiredAt.getTime() - this.helperService.dateCreate().getTime()
        );

        await this.cacheManager.set(
            key,
            {
                userId,
                sessionId,
                createdAt: this.helperService.dateCreate(),
                expiredAt,
            },
            ttl
        );

        return;
    }

    async deleteOneLogin(userId: string, sessionId: string): Promise<void> {
        const key = this.keyPattern
            .replace('{userId}', userId)
            .replace('{sessionId}', sessionId);
        await this.cacheManager.del(key);

        return;
    }

    async deleteAllLogins(
        userId: string,
        sessions: { id: string }[]
    ): Promise<void> {
        if (sessions.length > 0) {
            const key = this.keyPattern.replace('{userId}', userId);
            await this.cacheManager.mdel(
                sessions.map(session => key.replace('{sessionId}', session.id))
            );
        }

        return;
    }

    async flushAll(): Promise<void> {
        this.cacheManager.clear();
    }

    mapList(sessions: ISession[]): SessionResponseDto[] {
        return plainToInstance(SessionResponseDto, sessions);
    }

    mapActivityLogMetadata(session: ISession): IActivityLogMetadata {
        return {
            sessionId: session.id,
            userId: session.userId,
            userUsername: session.user.username,
            timestamp: session.updatedAt ?? session.createdAt,
        };
    }
}
