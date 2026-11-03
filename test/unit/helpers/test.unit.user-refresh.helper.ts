import type { MockProxy } from 'vitest-mock-extended';
import type { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import type {
    IAuthAccessTokenGenerate,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import type { SessionDomain } from '@modules/session/domains/session.domain';

export interface IUserRefreshSessionDoubles {
    authJwtDomain: MockProxy<AuthJwtDomain>;
    sessionDomain: MockProxy<SessionDomain>;
}

export interface IUserRefreshSessionFixture {
    payload: IAuthJwtRefreshTokenPayload;
    oldJti: string;
    refreshed: IAuthAccessTokenGenerate;
}

export function stubUserRefreshSession(
    doubles: IUserRefreshSessionDoubles,
    fixture: IUserRefreshSessionFixture
): void {
    doubles.authJwtDomain.payloadToken.mockReturnValue(fixture.payload);
    doubles.authJwtDomain.getRefreshJti.mockReturnValue(fixture.oldJti);
    doubles.authJwtDomain.refreshToken.mockReturnValue(fixture.refreshed);
    doubles.sessionDomain.updateJtiInTx.mockResolvedValue(true);
    doubles.sessionDomain.updateLogin.mockResolvedValue(
        EnumSessionCacheUpdate.updated
    );
}

export async function expectSessionRevoked(
    call: Promise<unknown>
): Promise<void> {
    await expect(call).rejects.toMatchObject({
        module: 'session',
        statusCode: EnumSessionStatusCodeError.revoked,
        statusCodeKey:
            EnumSessionStatusCodeError[EnumSessionStatusCodeError.revoked],
        messagePath: 'session.error.revoked',
    });
}
