import { HttpStatus } from '@nestjs/common';
import type { TokenPayload } from 'google-auth-library';
import type { AuthSocialDomain } from '@modules/auth/domains/auth.social.domain';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { createAuthSocialDomain } from '@test/unit/helpers/test.unit.auth.helper';

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

describe('AuthSocialDomain', () => {
    let domain: AuthSocialDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();

        oauth2ClientMock.mockImplementation(function (this: {
            verifyIdToken: typeof verifyIdTokenMock;
        }) {
            this.verifyIdToken = verifyIdTokenMock;
        });

        domain = await createAuthSocialDomain({});
    });

    describe('verifyGoogle', () => {
        it('constructs the Google client with the configured id only', () => {
            expect(oauth2ClientMock).toHaveBeenCalledWith('google-client-id');
        });

        it('builds no Google client when no client id is configured', async () => {
            oauth2ClientMock.mockClear();

            await createAuthSocialDomain({ 'auth.google.clientId': null });

            expect(oauth2ClientMock).not.toHaveBeenCalled();
        });

        it('throws AuthSocialGoogleNotConfiguredException before verifying when no client id is configured', async () => {
            const bare = await createAuthSocialDomain({
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

            const result = await domain.verifyGoogle('id-token');

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

            const rejection = domain.verifyGoogle('id-token');

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
                getPayload: vi
                    .fn()
                    .mockReturnValue({ email: undefined } as TokenPayload),
            });

            const rejection = domain.verifyGoogle('id-token');

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

            const rejection = domain.verifyGoogle('id-token');

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
        it('verifies with only the sign-in client id when the client id is unset', async () => {
            const bare = await createAuthSocialDomain({
                'auth.apple.clientId': null,
            });
            verifyAppleMock.mockResolvedValue({ email: 'jane@example.com' });

            await bare.verifyApple('id-token');

            expect(verifyAppleMock).toHaveBeenCalledWith({
                idToken: 'id-token',
                clientId: ['apple-sign-in-client-id'],
            });
        });

        it('verifies with only the client id when the sign-in client id is unset', async () => {
            const bare = await createAuthSocialDomain({
                'auth.apple.signInClientId': null,
            });
            verifyAppleMock.mockResolvedValue({ email: 'jane@example.com' });

            await bare.verifyApple('id-token');

            expect(verifyAppleMock).toHaveBeenCalledWith({
                idToken: 'id-token',
                clientId: ['apple-client-id'],
            });
        });

        it('throws AuthSocialAppleNotConfiguredException before verifying when neither client id is configured', async () => {
            const bare = await createAuthSocialDomain({
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
            const response = { email: 'jane@example.com' };
            verifyAppleMock.mockResolvedValue(response);

            const result = await domain.verifyApple('id-token');

            expect(result).toBe(response);
            expect(verifyAppleMock).toHaveBeenCalledWith({
                idToken: 'id-token',
                clientId: ['apple-client-id', 'apple-sign-in-client-id'],
            });
        });
    });
});
