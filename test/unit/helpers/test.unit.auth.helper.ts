import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { AuthSocialGithubGuard } from '@modules/auth/guards/social/auth.social.github.guard';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import type { AuthService } from '@modules/auth/services/auth.service';
import type { AuthUtil } from '@modules/auth/utils/auth.util';
import type { AuthSocialService } from '@modules/auth/services/auth.social.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';

export const AuthSocialConfigDefaults: Record<string, string | number | null> =
    {
        'auth.apple.clientId': 'apple-client-id',
        'auth.apple.signInClientId': 'apple-sign-in-client-id',
        'auth.google.clientId': 'google-client-id',
        'auth.github.clientId': 'github-client-id',
        'auth.github.clientSecret': 'github-client-secret',
        'auth.github.tokenUrl': 'https://github.test/login/oauth/access_token',
        'auth.github.apiUrl': 'https://api.github.test',
        'auth.github.apiVersion': '2026-03-10',
        'auth.github.timeoutInMs': 10000,
    };

export async function createAuthSocialService(
    overrides: Record<string, string | number | null>,
    authUtil: MockProxy<AuthUtil> = mock<AuthUtil>()
): Promise<AuthSocialService> {
    const { AuthSocialService: AuthSocialServiceClass } =
        await import('@modules/auth/services/auth.social.service');
    const { AuthUtil: AuthUtilClass } =
        await import('@modules/auth/utils/auth.util');
    const configService = buildConfigService({
        ...AuthSocialConfigDefaults,
        ...overrides,
    });

    const module = await Test.createTestingModule({
        providers: [
            AuthSocialServiceClass,
            { provide: ConfigService, useValue: configService },
            { provide: AuthUtilClass, useValue: authUtil },
        ],
    }).compile();

    return module.get(AuthSocialServiceClass);
}

export function buildGithubResponse(
    body: unknown,
    status = 200,
    headers: Record<string, string> = {}
): Response {
    return new Response(JSON.stringify(body), { status, headers });
}

export function stubGithubFetch(
    fetchSpy: MockInstance<typeof fetch>,
    ...responses: Response[]
): void {
    for (const response of responses) {
        fetchSpy.mockResolvedValueOnce(response);
    }
}

export async function expectNoGithubSecretLeak(
    rejection: Promise<unknown>,
    secrets: string[]
): Promise<void> {
    const [outcome] = await Promise.allSettled([rejection]);
    const serialized = JSON.stringify(
        outcome?.status === 'rejected' ? outcome.reason : null
    );

    for (const secret of secrets) {
        expect(serialized).not.toContain(secret);
    }
}

export async function expectGithubGuardRequired(
    guard: AuthSocialGithubGuard,
    authService: MockProxy<AuthService>,
    requestBody: unknown
): Promise<void> {
    const request: MockProxy<IRequestApp<IAuthSocialPayload>> =
        mock<IRequestApp<IAuthSocialPayload>>();
    request.body = requestBody;

    const rejection = guard.canActivate(buildHttpExecutionContext(request));

    await expect(rejection).rejects.toMatchObject({
        module: 'auth',
        statusCode: EnumAuthStatusCodeError.socialGithubRequired,
        statusCodeKey:
            EnumAuthStatusCodeError[
                EnumAuthStatusCodeError.socialGithubRequired
            ],
        messagePath: 'auth.error.socialGithubRequired',
    });
    expect(authService.validateOAuthGithub).not.toHaveBeenCalled();
}
