import type { MockProxy } from 'vitest-mock-extended';
import type { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import type {
    IAuthJwtRefreshTokenPayload,
    IAuthRefreshTokenGenerate,
} from '@modules/auth/interfaces/auth.interface';
import type { SessionCache } from '@modules/session/caches/session.cache';
import type { ISessionCache } from '@modules/session/interfaces/session.interface';

export interface IUserRefreshSessionDoubles {
    authJwtDomain: MockProxy<AuthJwtDomain>;
    sessionCache: MockProxy<SessionCache>;
    helperHashService: MockProxy<HelperHashService>;
}

export interface IUserRefreshSessionFixture {
    payload: IAuthJwtRefreshTokenPayload;
    session: ISessionCache;
    refreshed: IAuthRefreshTokenGenerate;
}

export function stubUserRefreshSession(
    doubles: IUserRefreshSessionDoubles,
    fixture: IUserRefreshSessionFixture
): void {
    doubles.authJwtDomain.payloadToken.mockReturnValue(fixture.payload);
    doubles.sessionCache.getLogin.mockResolvedValue(fixture.session);
    doubles.helperHashService.sha256Hash.mockImplementation(
        value => `hash(${value})`
    );
    doubles.helperHashService.sha256Compare.mockReturnValue(true);
    doubles.authJwtDomain.refreshToken.mockReturnValue(fixture.refreshed);
    doubles.sessionCache.updateLogin.mockResolvedValue(true);
}
