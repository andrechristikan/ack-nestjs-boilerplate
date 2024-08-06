import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyXApiKeyStrategy } from 'src/modules/api-key/guards/x-api-key/strategies/api-key.x-api-key.strategy';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/modules/api-key/enums/api-key.status-code.enum';

describe('ApiKeyXApiKeyStrategy', () => {
    let strategy: ApiKeyXApiKeyStrategy;
    let apiKeyService: ApiKeyService;
    let helperDateService: HelperDateService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyXApiKeyStrategy,
                {
                    provide: ApiKeyService,
                    useValue: {
                        findOneByActiveKey: jest.fn(),
                        createHashApiKey: jest.fn(),
                        validateHashApiKey: jest.fn(),
                    },
                },
                {
                    provide: HelperDateService,
                    useValue: {
                        create: jest.fn(),
                    },
                },
            ],
        }).compile();

        strategy = module.get<ApiKeyXApiKeyStrategy>(ApiKeyXApiKeyStrategy);
        apiKeyService = module.get<ApiKeyService>(ApiKeyService);
        helperDateService = module.get<HelperDateService>(HelperDateService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    it('should invoke validate through callback', async () => {
        const mockRequest: IRequestApp = { apiKey: null } as IRequestApp;

        const callback = (
            error: Error,
            verified: (
                error: Error,
                user?: Record<string, any>,
                info?: string | number
            ) => Promise<void>,
            req: any
        ) => {
            return strategy.validate('test-key:test-secret', verified, req);
        };

        jest.spyOn(strategy, 'validate').mockImplementation();

        strategy.verify('test-key:test-secret', callback, mockRequest);
        expect(strategy.validate).toHaveBeenCalled();
    });

    it('should call validate and pass if everything is valid', async () => {
        const mockApiKeyEntity = {
            _id: '1',
            key: 'test-key',
            hash: 'test-hash',
            type: 'test-type',
            isActive: true,
            startDate: new Date('2020-01-01'),
            endDate: new Date('2030-01-01'),
        };
        const mockRequest: IRequestApp = { apiKey: null } as IRequestApp;

        jest.spyOn(apiKeyService, 'findOneByActiveKey').mockResolvedValue(
            mockApiKeyEntity as any
        );
        jest.spyOn(helperDateService, 'create').mockReturnValue(
            new Date('2024-01-01')
        );
        jest.spyOn(apiKeyService, 'createHashApiKey').mockResolvedValue(
            'hashed-key'
        );
        jest.spyOn(apiKeyService, 'validateHashApiKey').mockResolvedValue(true);

        const verified = jest.fn();
        await strategy.validate('test-key:test-secret', verified, mockRequest);

        expect(apiKeyService.findOneByActiveKey).toHaveBeenCalledWith(
            'test-key'
        );
        expect(helperDateService.create).toHaveBeenCalled();
        expect(apiKeyService.createHashApiKey).toHaveBeenCalledWith(
            'test-key',
            'test-secret'
        );
        expect(apiKeyService.validateHashApiKey).toHaveBeenCalledWith(
            'hashed-key',
            'test-hash'
        );
        expect(mockRequest.apiKey).toEqual({
            _id: '1',
            name: '1',
            key: 'test-key',
            type: 'test-type',
        });
        expect(verified).toHaveBeenCalledWith(null, mockApiKeyEntity);
    });

    it('should throw UnauthorizedException if apiKey is invalid', async () => {
        const mockRequest: IRequestApp = { apiKey: null } as IRequestApp;
        const verified = jest.fn();

        await strategy.validate('invalid-key', verified, mockRequest);

        expect(verified).toHaveBeenCalledWith(
            new Error(`${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID}`),
            null,
            null
        );
    });

    it('should throw ForbiddenException if apiKey is not found', async () => {
        const mockRequest: IRequestApp = { apiKey: null } as IRequestApp;

        jest.spyOn(apiKeyService, 'findOneByActiveKey').mockResolvedValue(null);

        const verified = jest.fn();
        await strategy.validate('test-key:test-secret', verified, mockRequest);

        expect(verified).toHaveBeenCalledWith(
            new Error(`${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND}`),
            null,
            null
        );
    });

    it('should throw ForbiddenException if apiKey is inactive', async () => {
        const mockApiKeyEntity = {
            _id: '1',
            key: 'test-key',
            hash: 'test-hash',
            type: 'test-type',
            isActive: false,
            startDate: new Date('2020-01-01'),
            endDate: new Date('2030-01-01'),
        };
        const mockRequest: IRequestApp = { apiKey: null } as IRequestApp;

        jest.spyOn(apiKeyService, 'findOneByActiveKey').mockResolvedValue(
            mockApiKeyEntity as any
        );

        const verified = jest.fn();
        await strategy.validate('test-key:test-secret', verified, mockRequest);

        expect(verified).toHaveBeenCalledWith(
            new Error(`${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE}`),
            null,
            null
        );
    });

    it('should throw ForbiddenException if apiKey is expired', async () => {
        const mockApiKeyEntity = {
            _id: '1',
            key: 'test-key',
            hash: 'test-hash',
            type: 'test-type',
            isActive: true,
            startDate: new Date('2020-01-01'),
            endDate: new Date('2023-01-01'),
        };
        const mockRequest: IRequestApp = { apiKey: null } as IRequestApp;

        jest.spyOn(apiKeyService, 'findOneByActiveKey').mockResolvedValue(
            mockApiKeyEntity as any
        );
        jest.spyOn(helperDateService, 'create').mockReturnValue(
            new Date('2024-01-01')
        );

        const verified = jest.fn();
        await strategy.validate('test-key:test-secret', verified, mockRequest);

        expect(verified).toHaveBeenCalledWith(
            new Error(`${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED}`),
            null,
            null
        );
    });

    it('should throw ForbiddenException if apiKey is start date is less than today', async () => {
        const mockApiKeyEntity = {
            _id: '1',
            key: 'test-key',
            hash: 'test-hash',
            type: 'test-type',
            isActive: true,
            startDate: new Date('2020-01-01'),
            endDate: new Date('2025-01-01'),
        };
        const mockRequest: IRequestApp = { apiKey: null } as IRequestApp;

        jest.spyOn(apiKeyService, 'findOneByActiveKey').mockResolvedValue(
            mockApiKeyEntity as any
        );
        jest.spyOn(helperDateService, 'create').mockReturnValue(
            new Date('2024-01-01')
        );

        const verified = jest.fn();
        await strategy.validate('test-key:test-secret', verified, mockRequest);

        expect(verified).toHaveBeenCalledWith(
            new Error(`${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE}`),
            null,
            null
        );
    });

    it('should throw UnauthorizedException if apiKey hash validation fails', async () => {
        const mockApiKeyEntity = {
            _id: '1',
            key: 'test-key',
            hash: 'test-hash',
            type: 'test-type',
            isActive: true,
            startDate: new Date('2020-01-01'),
            endDate: new Date('2030-01-01'),
        };
        const mockRequest: IRequestApp = { apiKey: null } as IRequestApp;

        jest.spyOn(apiKeyService, 'findOneByActiveKey').mockResolvedValue(
            mockApiKeyEntity as any
        );
        jest.spyOn(helperDateService, 'create').mockReturnValue(
            new Date('2024-01-01')
        );
        jest.spyOn(apiKeyService, 'createHashApiKey').mockResolvedValue(
            'hashed-key'
        );
        jest.spyOn(apiKeyService, 'validateHashApiKey').mockResolvedValue(
            false
        );

        const verified = jest.fn();
        await strategy.validate('test-key:test-secret', verified, mockRequest);

        expect(verified).toHaveBeenCalledWith(
            new Error(`${ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID}`),
            null,
            null
        );
    });
});
