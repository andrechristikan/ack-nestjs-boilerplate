import { HelperService } from '@common/helper/services/helper.service';
import { SessionCacheProvider } from '@modules/session/constants/session.constant';
import { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import {
    ISession,
    ISessionCache,
} from '@modules/session/interfaces/session.interface';
import { Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

/**
 * Session Management Utility Service
 *
 * Manages user session operations including creation, retrieval, update, and deletion.
 * Sessions are stored in cache with TTL-based expiration for efficient session tracking.
 * Supports single session deletion and bulk deletion of all user sessions.
 *
 */
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

    /**
     * Retrieves a cached login session for a specific user and session ID.
     *
     * Constructs the cache key from user ID and session ID using the configured key pattern,
     * then retrieves the session data from the cache manager.
     *
     * @param userId - The unique identifier of the user
     * @param sessionId - The unique identifier of the session
     * @returns Promise resolving to the cached session data if found, null otherwise
     */
    async getLogin(
        userId: string,
        sessionId: string
    ): Promise<ISessionCache | null> {
        const key = this.keyPattern
            .replace('{userId}', userId)
            .replace('{sessionId}', sessionId);
        const cached = await this.cacheManager.get<ISessionCache>(key);

        return cached ?? null;
    }

    /**
     * Creates and stores a new login session in the cache.
     *
     * Constructs the cache key from user ID and session ID using the configured key pattern,
     * calculates the TTL (time to live) based on expiration date, and stores the session data.
     *
     * @param userId - The unique identifier of the user
     * @param sessionId - The unique identifier of the session
     * @param jti - The unique JWT token identifier for security validation
     * @param expiredAt - The date and time when the session expires
     * @returns Promise resolving when the session has been stored
     */
    async setLogin(
        userId: string,
        sessionId: string,
        jti: string,
        expiredAt: Date
    ): Promise<void> {
        const key = this.keyPattern
            .replace('{userId}', userId)
            .replace('{sessionId}', sessionId);
        const ttl = Math.floor(
            expiredAt.getTime() - this.helperService.dateCreate().getTime()
        );

        await this.cacheManager.set<ISessionCache>(
            key,
            {
                userId,
                sessionId,
                expiredAt,
                jti,
            },
            ttl
        );

        return;
    }

    /**
     * Updates an existing login session in the cache with a new token identifier (jti) and TTL.
     *
     * This method is typically used when refreshing tokens to update the jti while preserving or resetting
     * the session's expiration. The session data is updated in cache with the new jti and the TTL is set to
     * the provided expiredInMs value, which determines how much longer the session remains valid.
     *
     * @param userId - The unique identifier of the user
     * @param sessionId - The unique identifier of the session
     * @param session - The existing session cache data to update
     * @param jti - The new unique JWT token identifier to set
     * @param expiredInMs - The new time to live (TTL) for the session in milliseconds. This value determines
     *   how long the session will remain valid in cache from the time of update.
     * @returns Promise<void> Resolves when the session has been updated in cache
     */
    async updateLogin(
        userId: string,
        sessionId: string,
        session: ISessionCache,
        jti: string,
        expiredInMs: number
    ): Promise<void> {
        const key = this.keyPattern
            .replace('{userId}', userId)
            .replace('{sessionId}', sessionId);

        await this.cacheManager.set<ISessionCache>(
            key,
            {
                ...session,
                jti,
            },
            expiredInMs
        );

        return;
    }

    /**
     * Deletes a single login session from the cache.
     *
     * Constructs the cache key from user ID and session ID using the configured key pattern,
     * then removes the session from the cache manager.
     *
     * @param userId - The unique identifier of the user
     * @param sessionId - The unique identifier of the session to delete
     * @returns Promise resolving when the session has been deleted
     */
    async deleteOneLogin(userId: string, sessionId: string): Promise<void> {
        const key = this.keyPattern
            .replace('{userId}', userId)
            .replace('{sessionId}', sessionId);
        await this.cacheManager.del(key);

        return;
    }

    /**
     * Deletes all login sessions for a user from the cache.
     *
     * Takes an array of session IDs, constructs cache keys for each session using the configured key pattern,
     * and performs a bulk deletion if any sessions are provided.
     *
     * @param userId - The unique identifier of the user
     * @param sessions - Array of session objects containing IDs to delete
     * @returns Promise resolving when all sessions have been deleted
     */
    async deleteAllLogins(
        userId: string,
        sessions: { id: string }[]
    ): Promise<void> {
        if (sessions.length > 0) {
            const keys = sessions.map(session =>
                this.keyPattern
                    .replace('{userId}', userId)
                    .replace('{sessionId}', session.id)
            );
            await this.cacheManager.mdel(keys);
        }

        return;
    }

    /**
     * Clears all session data from the cache.
     *
     * Removes all cached sessions across all users. Use with caution as this will
     * invalidate all active sessions in the application.
     *
     * @returns Promise resolving when the cache has been cleared
     */
    async flushAll(): Promise<void> {
        await this.cacheManager.clear();
        return;
    }

    /**
     * Converts an array of session entities to session response DTOs.
     *
     * Uses class-transformer to transform session entities into response data transfer objects
     * suitable for API responses.
     *
     * @param sessions - Array of session entities to transform
     * @returns Array of SessionResponseDto instances with transformed data
     *
     * @see {@link SessionResponseDto} for the response DTO structure
     */
    mapList(sessions: ISession[]): SessionResponseDto[] {
        return plainToInstance(SessionResponseDto, sessions);
    }

    /**
     * Extracts activity log metadata from a session entity.
     *
     * Transforms session information into a structured activity log metadata object
     * containing session ID, user ID, username, and timestamp for audit trail purposes.
     *
     * @param session - The session entity containing user and timestamp information
     * @returns Activity log metadata object with session, user, and timestamp information
     *
     * @see {@link IActivityLogMetadata} for the metadata structure
     */
    mapActivityLogMetadata(session: ISession): IActivityLogMetadata {
        return {
            sessionId: session.id,
            userId: session.userId,
            userUsername: session.user.username,
            timestamp: session.updatedAt ?? session.createdAt,
        };
    }
}
