import { Request } from 'express';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { IPaginationQuery } from '@common/pagination/interfaces/pagination.interface';
import { ApiKey, GeoLocation, UserAgent } from '@generated/prisma-client';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { IUser } from '@modules/user/interfaces/user.interface';

/**
 * Extended Express Request interface with application-specific context fields.
 * Fields prefixed with `__` are set progressively by middleware and guards during the request lifecycle.
 *
 * @template T - JWT access token payload type; defaults to `IAuthJwtAccessTokenPayload`.
 */
export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Omit<
    Request,
    'user'
> {
    /** Unique correlation ID for distributed tracing, set by RequestRequestIdMiddleware. */
    correlationId: string;
    /** Authenticated user's JWT payload, available after `@AuthJwtAccessProtected()`. */
    user?: T;

    /** Validated API key entity, set by `@ApiKeyProtected()` guard. */
    __apiKey?: ApiKey;
    /** Full user entity, set by `@UserProtected()` guard. */
    __user?: IUser;
    /** CASL ability list, set by `@PolicyAbilityProtected()` guard. */
    __abilities?: RoleAbilityDto[];

    /** Pagination state accumulated by pagination pipes across the request lifecycle. */
    __pagination?: Partial<IPaginationQuery>;

    /** Resolved language code for this request, set by RequestCustomLanguageMiddleware. */
    __language: string;
    /** API version extracted from URL, set by RequestUrlVersionMiddleware. */
    __version: string;
}

/**
 * Structured request metadata captured for activity logging and audit purposes.
 */
export interface IRequestLog {
    /** Parsed user-agent information from the request headers. */
    userAgent: UserAgent;
    /** Client IP address; null if not resolvable. */
    ipAddress?: string | null;
    /** Geolocation data resolved from IP; null if not available. */
    geoLocation?: GeoLocation | null;
}
