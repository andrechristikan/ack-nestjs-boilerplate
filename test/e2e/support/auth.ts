import type { INestApplication } from '@nestjs/common';
import type request from 'supertest';
import { withDefaultApiKey } from '@test/e2e/support/api-key';
import {
    e2ePost,
    withApiKey,
    withBearer,
    withWorkspace,
} from '@test/e2e/support/request';
import type { IE2eUserFixture } from '@test/e2e/support/user.fixture';
import { DEFAULT_API_KEY_HEADER_VALUE } from '@test/e2e/support/api-key';

/**
 * Token pair issued by the real credential-login endpoint.
 */
export interface IE2eAuthTokens {
    accessToken: string;
    refreshToken: string;
}

/**
 * A unique-per-call device fingerprint, the same shape the login endpoint requires.
 */
export function e2eDevice(): { fingerprint: string } {
    return {
        fingerprint: `e2e-fingerprint-${Date.now()}-${Math.random()}`,
    };
}

/**
 * Logs in through the real `POST /public/user/login/credential` endpoint (the shared
 * authenticated-token helper every `/user`, `/shared`-scope spec reuses instead of hand-rolling
 * its own login request) and returns the issued access/refresh token pair. The account must not
 * have two-factor enabled — a 2FA account resolves a challenge token instead, not a token pair.
 */
export async function loginActiveUser(
    app: INestApplication,
    user: Pick<IE2eUserFixture, 'email' | 'password'>,
    overrides?: Partial<{
        from: string;
        device: { fingerprint: string };
    }>
): Promise<IE2eAuthTokens> {
    const response = await withDefaultApiKey(
        e2ePost(app, '/api/v1/public/user/login/credential')
    )
        .send({
            email: user.email,
            password: user.password,
            from: overrides?.from ?? 'website',
            device: overrides?.device ?? e2eDevice(),
        })
        .expect(200);

    return response.body.data.tokens as IE2eAuthTokens;
}

/**
 * Sets the `x-api-key` (seeded default key) and `Authorization: Bearer` headers a `/user`
 * shared-scope route needs, in the order every shared controller declares its guard stack.
 */
export function withSharedAuth(
    testRequest: request.Test,
    accessToken: string
): request.Test {
    return withBearer(
        withApiKey(testRequest, DEFAULT_API_KEY_HEADER_VALUE),
        accessToken
    );
}

/**
 * Sets the `x-api-key`, `Authorization: Bearer` and `x-workspace-id` headers a `/user`
 * scope workspace/project/analytic route needs (`@WorkspaceProtected()` resolves the current
 * workspace from `x-workspace-id` via CLS).
 */
export function withUserAuth(
    testRequest: request.Test,
    accessToken: string,
    workspaceId: string
): request.Test {
    return withWorkspace(
        withBearer(
            withApiKey(testRequest, DEFAULT_API_KEY_HEADER_VALUE),
            accessToken
        ),
        workspaceId
    );
}
