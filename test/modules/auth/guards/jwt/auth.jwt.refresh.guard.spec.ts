import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { AuthJwtRefreshGuard } from 'src/modules/auth/guards/jwt/auth.jwt.refresh.guard';

describe('AuthJwtRefreshGuard', () => {
    let guard: AuthJwtRefreshGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AuthJwtRefreshGuard],
        }).compile();

        guard = module.get<AuthJwtRefreshGuard>(AuthJwtRefreshGuard);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should return user if no error and user is present', () => {
        const user = { id: 1, username: 'testuser' };
        const result = guard.handleRequest(null, user, null);
        expect(result).toBe(user);
    });

    it('should throw UnauthorizedException if error is present', () => {
        const err = new Error('Test Error');
        expect(() => guard.handleRequest(err, null, null)).toThrow(
            new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_REFRESH_TOKEN,
                message: 'auth.error.refreshTokenUnauthorized',
                _error: 'Test Error',
            })
        );
    });

    it('should throw UnauthorizedException if user is not present', () => {
        const info = new Error('No user');
        expect(() => guard.handleRequest(null, null, info)).toThrow(
            new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_REFRESH_TOKEN,
                message: 'auth.error.refreshTokenUnauthorized',
                _error: 'No user',
            })
        );
    });
});
