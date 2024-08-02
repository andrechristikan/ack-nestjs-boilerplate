import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { AuthSocialGooglePayloadDto } from 'src/modules/auth/dtos/social/auth.social.google-payload.dto';
import { AuthSocialGoogleGuard } from 'src/modules/auth/guards/social/auth.social.google.guard';

@Injectable()
class MockAuthService {
    googleGetTokenInfo = jest.fn();
}

describe('AuthSocialGoogleGuard', () => {
    let guard: AuthSocialGoogleGuard;
    let authService: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialGoogleGuard,
                { provide: AuthService, useClass: MockAuthService },
            ],
        }).compile();

        guard = module.get<AuthSocialGoogleGuard>(AuthSocialGoogleGuard);
        authService = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('canActive', () => {
        it('should return true for valid token', async () => {
            const mockPayload: AuthSocialGooglePayloadDto = {
                email: 'test@example.com',
            };
            (authService.googleGetTokenInfo as jest.Mock).mockResolvedValue(
                mockPayload
            );

            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {
                            authorization: 'Bearer validToken',
                        },
                        user: {},
                    }),
                }),
            } as ExecutionContext;

            const result = await guard.canActivate(context);
            expect(result).toBe(true);
            expect(authService.googleGetTokenInfo).toHaveBeenCalledWith(
                'validToken'
            );
        });

        it('should return true for empty headers', async () => {
            const mockPayload: AuthSocialGooglePayloadDto = {
                email: 'test@example.com',
            };
            (authService.googleGetTokenInfo as jest.Mock).mockResolvedValue(
                mockPayload
            );

            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {},
                        user: {},
                    }),
                }),
            } as ExecutionContext;

            await expect(guard.canActivate(context)).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('should return true for valid token', async () => {
            const mockPayload: AuthSocialGooglePayloadDto = {
                email: 'test@example.com',
            };
            (authService.googleGetTokenInfo as jest.Mock).mockResolvedValue(
                mockPayload
            );

            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {
                            authorization: 'Bearer validToken',
                        },
                        user: {},
                    }),
                }),
            } as ExecutionContext;

            const result = await guard.canActivate(context);
            expect(result).toBe(true);
            expect(authService.googleGetTokenInfo).toHaveBeenCalledWith(
                'validToken'
            );
        });

        it('should throw UnauthorizedException for invalid token format', async () => {
            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {
                            authorization: 'InvalidTokenFormat',
                        },
                    }),
                }),
            } as ExecutionContext;

            await expect(guard.canActivate(context)).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('should throw UnauthorizedException for invalid token', async () => {
            (authService.googleGetTokenInfo as jest.Mock).mockRejectedValue(
                new Error('Invalid token')
            );

            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {
                            authorization: 'Bearer invalidToken',
                        },
                    }),
                }),
            } as ExecutionContext;

            await expect(guard.canActivate(context)).rejects.toThrow(
                UnauthorizedException
            );
        });
    });
});
