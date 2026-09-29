import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { TokenPayload } from 'google-auth-library';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

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
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let AuthSocialDomain: typeof import('@modules/auth/domains/auth.social.domain').AuthSocialDomain;
    let AuthSocialGoogleInvalidException: typeof import('@modules/auth/exceptions/auth.social-google-invalid.exception').AuthSocialGoogleInvalidException;
    let domain: InstanceType<typeof AuthSocialDomain>;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        ({ AuthSocialDomain } =
            await import('@modules/auth/domains/auth.social.domain'));
        ({ AuthSocialGoogleInvalidException } =
            await import('@modules/auth/exceptions/auth.social-google-invalid.exception'));

        oauth2ClientMock.mockImplementation(function (this: {
            verifyIdToken: typeof verifyIdTokenMock;
        }) {
            this.verifyIdToken = verifyIdTokenMock;
        });

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'auth.apple.clientId': 'apple-client-id',
                'auth.apple.signInClientId': 'apple-sign-in-client-id',
                'auth.google.clientId': 'google-client-id',
                'auth.google.clientSecret': 'google-client-secret',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialDomain,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        domain = module.get(AuthSocialDomain);
    });

    describe('verifyGoogle', () => {
        it('constructs the Google client with the configured id and secret', () => {
            expect(oauth2ClientMock).toHaveBeenCalledWith(
                'google-client-id',
                'google-client-secret'
            );
        });

        it('returns the verified payload', async () => {
            const payload = {
                email: 'jane@example.com',
                email_verified: true,
            } as TokenPayload;
            verifyIdTokenMock.mockResolvedValue({
                getPayload: () => payload,
            });

            const result = await domain.verifyGoogle('id-token');

            expect(result).toBe(payload);
            expect(verifyIdTokenMock).toHaveBeenCalledWith({
                idToken: 'id-token',
            });
        });

        it('throws when the token carries no payload', async () => {
            verifyIdTokenMock.mockResolvedValue({
                getPayload: () => undefined,
            });

            const rejection = domain.verifyGoogle('id-token');

            await expect(rejection).rejects.toBeInstanceOf(
                AuthSocialGoogleInvalidException
            );
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
                getPayload: () => ({ email: undefined }) as TokenPayload,
            });

            const rejection = domain.verifyGoogle('id-token');

            await expect(rejection).rejects.toBeInstanceOf(
                AuthSocialGoogleInvalidException
            );
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
                getPayload: () =>
                    ({
                        email: 'jane@example.com',
                        email_verified: false,
                    }) as TokenPayload,
            });

            const rejection = domain.verifyGoogle('id-token');

            await expect(rejection).rejects.toBeInstanceOf(
                AuthSocialGoogleInvalidException
            );
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
