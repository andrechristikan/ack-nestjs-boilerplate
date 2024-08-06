import { faker } from '@faker-js/faker';
import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, SetMetadata, UseGuards } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { API_KEY_X_TYPE_META_KEY } from 'src/modules/api-key/constants/api-key.constant';
import {
    ApiKeyPayload,
    ApiKeyProtected,
    ApiKeySystemProtected,
} from 'src/modules/api-key/decorators/api-key.decorator';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { ApiKeyXApiKeyGuard } from 'src/modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from 'src/modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';

jest.mock('@nestjs/common', () => ({
    ...jest.requireActual('@nestjs/common'),
    UseGuards: jest.fn(),
    SetMetadata: jest.fn(),
}));

/* eslint-disable */
function getParamDecoratorFactory(decorator: any) {
    class Test {
        public test(@decorator() value) {}
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    return args[Object.keys(args)[0]].factory;
}
/* eslint-enable */

describe('ApiKey Decorator', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('ApiKeyPayload', () => {
        it('Should return apiKey', () => {
            const apiKey = {
                _id: faker.string.uuid(),
                name: faker.person.jobTitle(),
                type: ENUM_API_KEY_TYPE.DEFAULT,
                key: faker.string.alpha(15),
                hash: faker.string.alpha(20),
                isActive: true,
                startDate: faker.date.past(),
                endDate: faker.date.future(),
                createdAt: faker.date.recent(),
                updatedAt: faker.date.recent(),
                deletedAt: faker.date.recent(),
            };

            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        apiKey,
                    }),
                }),
            });

            const decorator = getParamDecoratorFactory(ApiKeyPayload);

            const result = decorator(null, executionContext);
            expect(result).toBeTruthy();
            expect(result).toEqual(apiKey);
        });

        it('Should return apiKey id', () => {
            const apiKey = {
                _id: faker.string.uuid(),
                name: faker.person.jobTitle(),
                type: ENUM_API_KEY_TYPE.DEFAULT,
                key: faker.string.alpha(15),
                hash: faker.string.alpha(20),
                isActive: true,
                startDate: faker.date.past(),
                endDate: faker.date.future(),
                createdAt: faker.date.recent(),
                updatedAt: faker.date.recent(),
                deletedAt: faker.date.recent(),
            };

            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        apiKey,
                    }),
                }),
            });

            const decorator = getParamDecoratorFactory(ApiKeyPayload);

            const result = decorator('_id', executionContext);
            expect(result).toBeTruthy();
            expect(result).toEqual(apiKey._id);
        });
    });

    describe('ApiKeySystemProtected', () => {
        it('should create a valid ApiKeySystemProtected decorator', () => {
            const result = ApiKeySystemProtected();

            expect(result).toBeTruthy();
            expect(UseGuards).toHaveBeenCalledWith(
                ApiKeyXApiKeyGuard,
                ApiKeyXApiKeyTypeGuard
            );
            expect(SetMetadata).toHaveBeenCalledWith(API_KEY_X_TYPE_META_KEY, [
                ENUM_API_KEY_TYPE.SYSTEM,
            ]);
        });
    });

    describe('ApiKeyProtected', () => {
        it('should create a valid ApiKeyProtected decorator', () => {
            const result = ApiKeyProtected();

            expect(result).toBeTruthy();
            expect(UseGuards).toHaveBeenCalledWith(
                ApiKeyXApiKeyGuard,
                ApiKeyXApiKeyTypeGuard
            );
            expect(SetMetadata).toHaveBeenCalledWith(API_KEY_X_TYPE_META_KEY, [
                ENUM_API_KEY_TYPE.DEFAULT,
            ]);
        });
    });
});
