import { HttpStatus } from '@nestjs/common';
import type { TokenPayload } from 'google-auth-library';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { MockInstance } from 'vitest';
import type { AppUnknownException as AppUnknownExceptionClass } from '@app/exceptions/app.unknown.exception';
import type { AuthSocialService } from '@modules/auth/services/auth.social.service';
import type { AuthUtil } from '@modules/auth/utils/auth.util';
import type { AuthProviderUnavailableException as AuthProviderUnavailableExceptionClass } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
import type { AuthSocialGithubInvalidException as AuthSocialGithubInvalidExceptionClass } from '@modules/auth/exceptions/auth.social-github-invalid.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import {
    buildGithubResponse,
    createAuthSocialService,
    expectNoGithubSecretLeak,
    stubGithubFetch,
} from '@test/unit/helpers/test.unit.auth.helper';

const { verifyIdTokenMock, oauth2ClientMock, verifyAppleMock } = vi.hoisted(
    () => ({
        verifyIdTokenMock: vi.fn(),
        oauth2ClientMock: vi.fn(),
        verifyAppleMock: vi.fn(),
    })
);

vi.mock('google-auth-library', () => ({
    OAuth2Client: oauth2ClientMock.mockImplementation(function (this: {
        verifyIdToken: typeof verifyIdTokenMock;
    }) {
        this.verifyIdToken = verifyIdTokenMock;
    }),
    LoginTicket: {},
}));

vi.mock('verify-apple-id-token', () => ({
    default: { default: verifyAppleMock },
}));

describe('AuthSocialService', () => {
    const authUtil: MockProxy<AuthUtil> = mock<AuthUtil>();
    let service: AuthSocialService;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();

        oauth2ClientMock.mockImplementation(function (this: {
            verifyIdToken: typeof verifyIdTokenMock;
        }) {
            this.verifyIdToken = verifyIdTokenMock;
        });

        service = await createAuthSocialService({}, authUtil);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('verifyGithub', () => {
        const accessToken = 'gho_stubbed_access_token';
        const clientSecret = 'github-client-secret';
        const code = 'auth-code';
        const redirectUri = 'https://app.example.com/callback';
        const codeVerifier = 'v'.repeat(43);
        const tokenUrl = 'https://github.test/login/oauth/access_token';
        const emailsUrl = 'https://api.github.test/user/emails';
        const emails = [
            { email: 'other@example.com', primary: false, verified: true },
            { email: 'jane@example.com', primary: true, verified: true },
        ];
        let fetchSpy: MockInstance<typeof fetch>;
        let AppUnknownException: typeof AppUnknownExceptionClass;
        let AuthProviderUnavailableException: typeof AuthProviderUnavailableExceptionClass;
        let AuthSocialGithubInvalidException: typeof AuthSocialGithubInvalidExceptionClass;

        beforeEach(async () => {
            ({ AppUnknownException } =
                await import('@app/exceptions/app.unknown.exception'));
            ({ AuthProviderUnavailableException } =
                await import('@modules/auth/exceptions/auth.provider-unavailable.exception'));
            ({ AuthSocialGithubInvalidException } =
                await import('@modules/auth/exceptions/auth.social-github-invalid.exception'));
            fetchSpy = vi.spyOn(globalThis, 'fetch');
            authUtil.toGithubUnavailableException.mockReturnValue(null);
            authUtil.toGithubEmailsException.mockReturnValue(null);
            authUtil.parseGithubToken.mockImplementation(text =>
                JSON.parse(text)
            );
            authUtil.parseGithubEmails.mockImplementation(text =>
                JSON.parse(text)
            );
        });

        it('throws AuthSocialGithubNotConfiguredException before any call when the client id is null', async () => {
            const bare = await createAuthSocialService(
                { 'auth.github.clientId': null },
                authUtil
            );

            const rejection = bare.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGithubNotConfigured,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGithubNotConfigured
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'auth.error.socialGithubNotConfigured',
            });
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('throws AuthSocialGithubNotConfiguredException when the client secret is null', async () => {
            const bare = await createAuthSocialService(
                { 'auth.github.clientSecret': null },
                authUtil
            );

            const rejection = bare.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.socialGithubNotConfigured,
            });
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('posts the code, secret, and verifier in the token request body', async () => {
            let body = '';
            fetchSpy.mockImplementationOnce(async (_url, init) => {
                body = String(init?.body);

                return buildGithubResponse({ access_token: accessToken });
            });
            stubGithubFetch(fetchSpy, buildGithubResponse(emails));

            await service.verifyGithub(code, redirectUri, codeVerifier);

            expect(fetchSpy).toHaveBeenNthCalledWith(
                1,
                tokenUrl,
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: expect.any(URLSearchParams),
                    signal: expect.any(AbortSignal),
                })
            );
            expect(Object.fromEntries(new URLSearchParams(body))).toEqual({
                client_id: 'github-client-id',
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            });
        });

        it('reads the emails with the bearer token and the API version header', async () => {
            stubGithubFetch(
                fetchSpy,
                buildGithubResponse({ access_token: accessToken }),
                buildGithubResponse(emails)
            );

            await service.verifyGithub(code, redirectUri, codeVerifier);

            expect(fetchSpy).toHaveBeenNthCalledWith(
                2,
                emailsUrl,
                expect.objectContaining({
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2026-03-10',
                    },
                    signal: expect.any(AbortSignal),
                })
            );
        });

        it('returns the primary verified email', async () => {
            stubGithubFetch(
                fetchSpy,
                buildGithubResponse({ access_token: accessToken }),
                buildGithubResponse(emails)
            );

            const result = await service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            expect(result).toBe('jane@example.com');
            expect(authUtil.parseGithubToken).toHaveBeenCalledWith(
                JSON.stringify({ access_token: accessToken })
            );
            expect(authUtil.parseGithubEmails).toHaveBeenCalledWith(
                JSON.stringify(emails)
            );
        });

        it('throws AuthSocialGithubInvalidException when no email is primary and verified', async () => {
            stubGithubFetch(
                fetchSpy,
                buildGithubResponse({ access_token: accessToken }),
                buildGithubResponse([
                    { email: 'a@example.com', primary: true, verified: false },
                    { email: 'b@example.com', primary: false, verified: true },
                ])
            );

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGithubInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGithubInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.socialGithubInvalid',
                rawError: 'GitHub account has no primary verified email',
            });
        });

        it.each([
            'bad_verification_code',
            'redirect_uri_mismatch',
            'unverified_user_email',
        ])(
            'throws the mapped client exception for the token error %s',
            async error => {
                const mapped = new AuthSocialGithubInvalidException({ error });
                authUtil.toGithubTokenException.mockReturnValue(mapped);
                stubGithubFetch(
                    fetchSpy,
                    buildGithubResponse({ error, error_description: 'bad' })
                );

                const rejection = service.verifyGithub(
                    code,
                    redirectUri,
                    codeVerifier
                );

                await expect(rejection).rejects.toBe(mapped);
                expect(authUtil.toGithubTokenException).toHaveBeenCalledWith(
                    error,
                    'bad'
                );
                expect(fetchSpy).toHaveBeenCalledTimes(1);
            }
        );

        it('throws the mapped unknown exception for incorrect_client_credentials and passes a null description', async () => {
            const mapped = new AppUnknownException({}, 'rejected');
            authUtil.toGithubTokenException.mockReturnValue(mapped);
            stubGithubFetch(
                fetchSpy,
                buildGithubResponse({ error: 'incorrect_client_credentials' })
            );

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toBe(mapped);
            expect(authUtil.toGithubTokenException).toHaveBeenCalledWith(
                'incorrect_client_credentials',
                null
            );
        });

        it('throws AppUnknownException when the token response carries no access_token', async () => {
            stubGithubFetch(
                fetchSpy,
                buildGithubResponse({ token_type: 'bearer' })
            );

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toMatchObject({
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                description: 'GitHub token response carries no access_token',
                rawError: { token_type: 'bearer' },
            });
        });

        it('throws AppUnknownException when the token body is not JSON', async () => {
            authUtil.parseGithubToken.mockReturnValue(
                new AppUnknownException(
                    new SyntaxError('bad'),
                    'GitHub token response is not JSON'
                )
            );
            stubGithubFetch(fetchSpy, new Response('<html>', { status: 200 }));

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                description: 'GitHub token response is not JSON',
            });
            expect(authUtil.parseGithubToken).toHaveBeenCalledWith('<html>');
        });

        it('throws AppUnknownException when the emails body is not JSON', async () => {
            authUtil.parseGithubEmails.mockReturnValue(
                new AppUnknownException(
                    new SyntaxError('bad'),
                    'GitHub emails response is not JSON'
                )
            );
            stubGithubFetch(
                fetchSpy,
                buildGithubResponse({ access_token: accessToken }),
                new Response('<html>', { status: 200 })
            );

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                description: 'GitHub emails response is not JSON',
            });
            expect(authUtil.parseGithubEmails).toHaveBeenCalledWith('<html>');
            await expectNoGithubSecretLeak(rejection, [
                accessToken,
                clientSecret,
            ]);
        });

        it.each([401, 403, 404])(
            'throws the mapped invalid exception for an emails %i',
            async status => {
                const mapped = new AuthSocialGithubInvalidException({ status });
                authUtil.toGithubEmailsException.mockReturnValue(mapped);
                stubGithubFetch(
                    fetchSpy,
                    buildGithubResponse({ access_token: accessToken }),
                    buildGithubResponse({ message: 'denied' }, status)
                );

                const rejection = service.verifyGithub(
                    code,
                    redirectUri,
                    codeVerifier
                );

                await expect(rejection).rejects.toBe(mapped);
                expect(authUtil.toGithubEmailsException).toHaveBeenCalledWith(
                    status
                );
                await expectNoGithubSecretLeak(rejection, [
                    accessToken,
                    clientSecret,
                ]);
            }
        );

        it('throws the mapped unknown exception for an emails 410', async () => {
            const mapped = new AppUnknownException({ status: 410 }, 'gone');
            authUtil.toGithubEmailsException.mockReturnValue(mapped);
            stubGithubFetch(
                fetchSpy,
                buildGithubResponse({ access_token: accessToken }),
                buildGithubResponse({}, 410)
            );

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toBe(mapped);
        });

        it('throws the unavailable exception for a 502 token response before reading the body', async () => {
            const mapped = new AuthProviderUnavailableException({
                status: 502,
            });
            authUtil.toGithubUnavailableException.mockReturnValue(mapped);
            stubGithubFetch(
                fetchSpy,
                new Response('bad gateway', { status: 502 })
            );

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toBe(mapped);
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('throws the unavailable exception for a 429 with retry-after on the token request', async () => {
            const mapped = new AuthProviderUnavailableException({
                status: 429,
            });
            let retryAfter: string | null = null;
            authUtil.toGithubUnavailableException.mockImplementation(
                (_status, headers) => {
                    retryAfter = headers.get('retry-after');

                    return mapped;
                }
            );
            stubGithubFetch(
                fetchSpy,
                new Response('{}', {
                    status: 429,
                    headers: { 'retry-after': '60' },
                })
            );

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toBe(mapped);
            expect(authUtil.toGithubUnavailableException).toHaveBeenCalledWith(
                429,
                expect.any(Headers)
            );
            expect(retryAfter).toBe('60');
        });

        it('throws the unavailable exception for a rate-limited 403 on the emails request', async () => {
            const mapped = new AuthProviderUnavailableException({
                status: 403,
            });
            authUtil.toGithubUnavailableException
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(mapped);
            stubGithubFetch(
                fetchSpy,
                buildGithubResponse({ access_token: accessToken }),
                buildGithubResponse({}, 403, { 'x-ratelimit-remaining': '0' })
            );

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toBe(mapped);
            expect(authUtil.toGithubEmailsException).not.toHaveBeenCalled();
        });

        it('wraps a rejected fetch as AuthProviderUnavailableException', async () => {
            fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.providerUnavailable,
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
            });
        });

        it('wraps a TimeoutError as AuthProviderUnavailableException', async () => {
            fetchSpy.mockRejectedValueOnce(
                new DOMException('timed out', 'TimeoutError')
            );

            const rejection = service.verifyGithub(
                code,
                redirectUri,
                codeVerifier
            );

            await expect(rejection).rejects.toMatchObject({
                statusCode: EnumAuthStatusCodeError.providerUnavailable,
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
            });
        });
    });

    describe('verifyGoogle', () => {
        it('constructs the Google client with the configured id only', () => {
            expect(oauth2ClientMock).toHaveBeenCalledWith('google-client-id');
        });

        it('builds no Google client when no client id is configured', async () => {
            oauth2ClientMock.mockClear();

            await createAuthSocialService({ 'auth.google.clientId': null });

            expect(oauth2ClientMock).not.toHaveBeenCalled();
        });

        it('throws AuthSocialGoogleNotConfiguredException before verifying when no client id is configured', async () => {
            const bare = await createAuthSocialService({
                'auth.google.clientId': null,
            });

            const rejection = bare.verifyGoogle('id-token');

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleNotConfigured,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGoogleNotConfigured
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'auth.error.socialGoogleNotConfigured',
            });
            expect(verifyIdTokenMock).not.toHaveBeenCalled();
        });

        it('returns the verified payload', async () => {
            const payload = {
                email: 'jane@example.com',
                email_verified: true,
            } as TokenPayload;
            verifyIdTokenMock.mockResolvedValue({
                getPayload: vi.fn().mockReturnValue(payload),
            });

            const result = await service.verifyGoogle('id-token');

            expect(result).toBe(payload);
            expect(verifyIdTokenMock).toHaveBeenCalledWith({
                idToken: 'id-token',
                audience: 'google-client-id',
            });
        });

        it('throws when the token carries no payload', async () => {
            verifyIdTokenMock.mockResolvedValue({
                getPayload: vi.fn().mockReturnValue(undefined),
            });

            const rejection = service.verifyGoogle('id-token');

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGoogleInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.socialGoogleInvalid',
                rawError: 'Unable to extract payload from Google token',
            });
        });

        it('throws when the payload has no email', async () => {
            verifyIdTokenMock.mockResolvedValue({
                getPayload: vi.fn().mockReturnValue({} as TokenPayload),
            });

            const rejection = service.verifyGoogle('id-token');

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGoogleInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.socialGoogleInvalid',
                rawError: 'Google token payload does not contain email',
            });
        });

        it('throws when the payload email is not verified', async () => {
            verifyIdTokenMock.mockResolvedValue({
                getPayload: vi.fn().mockReturnValue({
                    email: 'jane@example.com',
                    email_verified: false,
                } as TokenPayload),
            });

            const rejection = service.verifyGoogle('id-token');

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGoogleInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.socialGoogleInvalid',
                rawError:
                    'Google token payload does not contain email_verified',
            });
        });
    });

    describe('verifyApple', () => {
        const appleResponse = {
            email: 'jane@example.com',
            email_verified: true,
        };

        it('verifies with only the sign-in client id when the client id is unset', async () => {
            const bare = await createAuthSocialService({
                'auth.apple.clientId': null,
            });
            verifyAppleMock.mockResolvedValue(appleResponse);

            await bare.verifyApple('id-token');

            expect(verifyAppleMock).toHaveBeenCalledWith({
                idToken: 'id-token',
                clientId: ['apple-sign-in-client-id'],
            });
        });

        it('verifies with only the client id when the sign-in client id is unset', async () => {
            const bare = await createAuthSocialService({
                'auth.apple.signInClientId': null,
            });
            verifyAppleMock.mockResolvedValue(appleResponse);

            await bare.verifyApple('id-token');

            expect(verifyAppleMock).toHaveBeenCalledWith({
                idToken: 'id-token',
                clientId: ['apple-client-id'],
            });
        });

        it('throws AuthSocialAppleNotConfiguredException before verifying when neither client id is configured', async () => {
            const bare = await createAuthSocialService({
                'auth.apple.clientId': null,
                'auth.apple.signInClientId': null,
            });

            const rejection = bare.verifyApple('id-token');

            await expect(rejection).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialAppleNotConfigured,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialAppleNotConfigured
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'auth.error.socialAppleNotConfigured',
            });
            expect(verifyAppleMock).not.toHaveBeenCalled();
        });

        it('verifies the Apple id token with both configured client ids', async () => {
            verifyAppleMock.mockResolvedValue(appleResponse);

            const result = await service.verifyApple('id-token');

            expect(result).toBe(appleResponse);
            expect(verifyAppleMock).toHaveBeenCalledWith({
                idToken: 'id-token',
                clientId: ['apple-client-id', 'apple-sign-in-client-id'],
            });
        });

        it('accepts an email_verified claim Apple sends as the string "true"', async () => {
            const response = { ...appleResponse, email_verified: 'true' };
            verifyAppleMock.mockResolvedValue(response);

            const result = await service.verifyApple('id-token');

            expect(result).toBe(response);
        });

        it.each([
            ['no email', { email_verified: true }],
            ['an empty email', { email: '', email_verified: true }],
            ['no email_verified', { email: 'jane@example.com' }],
            [
                'email_verified false',
                { email: 'jane@example.com', email_verified: false },
            ],
            [
                'email_verified the string "false"',
                { email: 'jane@example.com', email_verified: 'false' },
            ],
        ])(
            'throws AuthSocialAppleInvalidException when the token has %s',
            async (_label, response) => {
                verifyAppleMock.mockResolvedValue(response);

                const rejection = service.verifyApple('id-token');

                await expect(rejection).rejects.toMatchObject({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.socialAppleInvalid,
                    statusCodeKey:
                        EnumAuthStatusCodeError[
                            EnumAuthStatusCodeError.socialAppleInvalid
                        ],
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    messagePath: 'auth.error.socialAppleInvalid',
                });
            }
        );
    });
});
