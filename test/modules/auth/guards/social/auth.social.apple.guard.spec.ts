import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { AuthSocialApplePayloadDto } from 'src/modules/auth/dtos/social/auth.social.apple-payload.dto';
import { AuthSocialAppleGuard } from 'src/modules/auth/guards/social/auth.social.apple.guard';

@Injectable()
class MockAuthService {
    appleGetTokenInfo = jest.fn();
}

describe('AuthSocialAppleGuard', () => {
    let guard: AuthSocialAppleGuard;
    let authService: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSocialAppleGuard,
                { provide: AuthService, useClass: MockAuthService },
            ],
        }).compile();

        guard = module.get<AuthSocialAppleGuard>(AuthSocialAppleGuard);
        authService = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('canActivate', () => {
        it('should return true for valid token', async () => {
            const mockPayload: AuthSocialApplePayloadDto = {
                email: 'test@example.com',
            };
            (authService.appleGetTokenInfo as jest.Mock).mockResolvedValue(
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
            expect(authService.appleGetTokenInfo).toHaveBeenCalledWith(
                'validToken'
            );
        });

        it('should return true for empty headers', async () => {
            const mockPayload: AuthSocialApplePayloadDto = {
                email: 'test@example.com',
            };
            (authService.appleGetTokenInfo as jest.Mock).mockResolvedValue(
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
            (authService.appleGetTokenInfo as jest.Mock).mockRejectedValue(
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
