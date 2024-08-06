import { Test } from '@nestjs/testing';
import { ApiKeyXApiKeyTypeGuard } from 'src/modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { Reflector } from '@nestjs/core';
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';

const mockReflector = {
    getAllAndOverride: jest.fn(),
};

function createMockExecutionContext(
    request: Partial<IRequestApp> = {}
): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
        getClass: jest.fn(),
        getHandler: jest.fn(),
    } as unknown as ExecutionContext;
}

describe('ApiKeyXApiKeyTypeGuard', () => {
    let guard: ApiKeyXApiKeyTypeGuard;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyTypeGuard,
                {
                    provide: Reflector,
                    useValue: mockReflector,
                },
            ],
        }).compile();

        guard = module.get<ApiKeyXApiKeyTypeGuard>(ApiKeyXApiKeyTypeGuard);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('canActivate', () => {
        it('should return true if no required types are specified', async () => {
            const mockExecutionContext = createMockExecutionContext();

            mockReflector.getAllAndOverride.mockReturnValue(undefined);

            const result = await guard.canActivate(mockExecutionContext);
            expect(result).toBe(true);
        });

        it('should return true if the apiKey type is allowed', async () => {
            const mockExecutionContext = createMockExecutionContext({
                apiKey: { type: ENUM_API_KEY_TYPE.SYSTEM },
            } as any);

            mockReflector.getAllAndOverride.mockReturnValue([
                ENUM_API_KEY_TYPE.SYSTEM,
            ]);

            const result = await guard.canActivate(mockExecutionContext);
            expect(result).toBe(true);
        });

        it('should throw BadRequestException if the apiKey type is not allowed', async () => {
            const mockExecutionContext = createMockExecutionContext({
                apiKey: { type: ENUM_API_KEY_TYPE.SYSTEM },
            } as any);

            mockReflector.getAllAndOverride.mockReturnValue([
                ENUM_API_KEY_TYPE.DEFAULT,
            ]);

            try {
                await guard.canActivate(mockExecutionContext);
            } catch (error) {
                expect(error).toBeInstanceOf(BadRequestException);
                expect(error.response).toEqual({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_FORBIDDEN,
                    message: 'apiKey.error.xApiKey.forbidden',
                });
            }
        });
    });
});
