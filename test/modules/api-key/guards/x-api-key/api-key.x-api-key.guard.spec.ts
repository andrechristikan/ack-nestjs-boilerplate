import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyXApiKeyGuard } from 'src/modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';

describe('ApiKeyXApiKeyGuard', () => {
    let guard: ApiKeyXApiKeyGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyGuard,
                {
                    provide: AuthGuard('x-api-key'),
                    useValue: {
                        canActivate: jest.fn(),
                        handleRequest: jest.fn(),
                        prototype: {
                            canActivate: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        guard = module.get<ApiKeyXApiKeyGuard>(ApiKeyXApiKeyGuard);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should throw UnauthorizedException if apiKey is missing', () => {
        const err = null;
        const apiKey = {};
        const info = { message: 'Missing Api Key' };

        try {
            guard.handleRequest(err, apiKey, info as any);
        } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException);
            expect(error.response).toEqual({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_REQUIRED,
                message: 'apiKey.error.xApiKey.required',
            });
        }
    });

    it('should throw ForbiddenException if apiKey not found', () => {
        const err = new Error(
            ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND.toString()
        );
        const apiKey = {};
        const info = null;

        try {
            guard.handleRequest(err, apiKey, info);
        } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
            expect(error.response).toEqual({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND,
                message: 'apiKey.error.xApiKey.notFound',
            });
        }
    });

    it('should throw ForbiddenException if apiKey is inactive', () => {
        const err = new Error(
            ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE.toString()
        );
        const apiKey = {};
        const info = null;

        try {
            guard.handleRequest(err, apiKey, info);
        } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
            expect(error.response).toEqual({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE,
                message: 'apiKey.error.xApiKey.inactive',
            });
        }
    });

    it('should throw ForbiddenException if apiKey is expired', () => {
        const err = new Error(
            ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED.toString()
        );
        const apiKey = {};
        const info = null;

        try {
            guard.handleRequest(err, apiKey, info);
        } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
            expect(error.response).toEqual({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED,
                message: 'apiKey.error.xApiKey.expired',
            });
        }
    });

    it('should throw UnauthorizedException if apiKey is invalid', () => {
        const err = new Error();
        const apiKey = {};
        const info = null;

        try {
            guard.handleRequest(err, apiKey, info);
        } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException);
            expect(error.response).toEqual({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }
    });

    it('should return the apiKey if valid', () => {
        const err = null;
        const apiKey = { key: 'valid-api-key' };
        const info = null;

        const result = guard.handleRequest(err, apiKey, info);

        expect(result).toEqual(apiKey);
    });
});
