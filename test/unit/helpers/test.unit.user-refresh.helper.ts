import type { MockProxy } from 'vitest-mock-extended';
import type { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import type {
    IAuthAccessTokenGenerate,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import type { SessionService } from '@modules/session/services/session.service';

export interface IUserRefreshSessionDoubles {
    authJwtService: MockProxy<AuthJwtService>;
    sessionService: MockProxy<SessionService>;
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
    doubles.authJwtService.payloadToken.mockReturnValue(fixture.payload);
    doubles.authJwtService.getRefreshJti.mockReturnValue(fixture.oldJti);
    doubles.authJwtService.refreshToken.mockReturnValue(fixture.refreshed);
    doubles.sessionService.updateJtiInTx.mockResolvedValue(true);
    doubles.sessionService.updateLogin.mockResolvedValue(
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
