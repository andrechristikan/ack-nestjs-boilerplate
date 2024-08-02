import { ExecutionContext, UseGuards } from '@nestjs/common';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtAccessGuard } from 'src/modules/auth/guards/jwt/auth.jwt.access.guard';
import { AuthJwtRefreshGuard } from 'src/modules/auth/guards/jwt/auth.jwt.refresh.guard';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { faker } from '@faker-js/faker';
import { createMock } from '@golevelup/ts-jest';

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

describe('AuthJwt Decorators', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('AuthJwtPayload', () => {
        it('Should return auth payload', () => {
            const payload: AuthJwtAccessPayloadDto = {
                _id: faker.string.uuid(),
                email: faker.internet.email(),
            } as AuthJwtAccessPayloadDto;

            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        user: payload,
                    }),
                }),
            });

            const decorator = getParamDecoratorFactory(AuthJwtPayload);

            const result = decorator(null, executionContext);
            expect(result).toBeTruthy();
            expect(result).toEqual(payload);
        });

        it('Should return user id from payload', () => {
            const payload: AuthJwtAccessPayloadDto = {
                _id: faker.string.uuid(),
                email: faker.internet.email(),
            } as AuthJwtAccessPayloadDto;

            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        user: payload,
                    }),
                }),
            });

            const decorator = getParamDecoratorFactory(AuthJwtPayload);

            const result = decorator('_id', executionContext);
            expect(result).toBeTruthy();
            expect(result).toEqual(payload._id);
        });
    });

    describe('AuthJwtToken', () => {
        it('Should return token of jwt', () => {
            const token = faker.string.alphanumeric(20);

            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        headers: {
                            authorization: `Bearer ${token}`,
                        },
                    }),
                }),
            });

            const decorator = getParamDecoratorFactory(AuthJwtToken);

            const result = decorator(null, executionContext);
            expect(result).toBeTruthy();
            expect(result).toEqual(token);
        });

        it('Should return undefined', () => {
            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        headers: {
                            authorization: `Bearer`,
                        },
                    }),
                }),
            });

            const decorator = getParamDecoratorFactory(AuthJwtToken);

            const result = decorator(null, executionContext);
            expect(result).toEqual(undefined);
        });

        it('Should return undefined if authorization header is undefined', () => {
            const executionContext = createMock<ExecutionContext>({
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        headers: {},
                    }),
                }),
            });

            const decorator = getParamDecoratorFactory(AuthJwtToken);

            const result = decorator(null, executionContext);
            expect(result).toEqual(undefined);
        });
    });

    describe('AuthJwtAccessProtected', () => {
        it('should apply AuthJwtAccessGuard', () => {
            const result = AuthJwtAccessProtected();

            expect(result).toBeTruthy();
            expect(UseGuards).toHaveBeenCalledWith(AuthJwtAccessGuard);
        });
    });

    describe('AuthJwtRefreshProtected', () => {
        it('should apply AuthJwtRefreshGuard', () => {
            const result = AuthJwtRefreshProtected();

            expect(result).toBeTruthy();
            expect(UseGuards).toHaveBeenCalledWith(AuthJwtRefreshGuard);
        });
    });
});
