import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import {
    FeatureFlagAnonymousIdHeaderName,
    FeatureFlagKeyPathMetaKey,
} from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';

describe('FeatureFlagGuard', () => {
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const configGet =
        vi.fn<(key: string) => string | number | RegExp | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    let guard: FeatureFlagGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation(key => {
            if (key === 'featureFlag.anonymous.idMaxLength') {
                return 20;
            } else if (key === 'featureFlag.anonymous.idRegex') {
                return /^[a-zA-Z0-9-_]+$/;
            }

            return undefined;
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagGuard,
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: Reflector, useValue: reflector },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        guard = module.get(FeatureFlagGuard);
    });

    it('reads the anonymous id config once, in the constructor', () => {
        expect(configGet).toHaveBeenCalledWith(
            'featureFlag.anonymous.idMaxLength'
        );
        expect(configGet).toHaveBeenCalledWith('featureFlag.anonymous.idRegex');
    });

    describe('canActivate', () => {
        it("resolves true and validates with the caller's userId when no anonymous header is sent", async () => {
            reflector.get.mockReturnValue('changePassword');
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {};
            request.user = {
                loginAt: new Date('2026-01-01T00:00:00.000Z'),
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                email: 'jane@example.com',
                username: 'meadowlark',
                userId: '507f1f77bcf86cd799439011',
                sessionId: '507f1f77bcf86cd799439012',
                deviceOwnershipId: '507f1f77bcf86cd799439013',
                roleId: '507f1f77bcf86cd799439014',
            };
            const executionContext = buildHttpExecutionContext(request);
            featureFlagDomain.validateFeatureFlag.mockResolvedValue(undefined);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(reflector.get).toHaveBeenCalledWith(
                FeatureFlagKeyPathMetaKey,
                executionContext.getHandler()
            );
            expect(featureFlagDomain.validateFeatureFlag).toHaveBeenCalledWith(
                'changePassword',
                '507f1f77bcf86cd799439011',
                null
            );
        });

        it('validates with a null userId when the caller carries no user', async () => {
            reflector.get.mockReturnValue('changePassword');
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {};
            delete request.user;
            const executionContext = buildHttpExecutionContext(request);
            featureFlagDomain.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagDomain.validateFeatureFlag).toHaveBeenCalledWith(
                'changePassword',
                null,
                null
            );
        });

        it('passes a valid anonymous header through as the anonymousId', async () => {
            reflector.get.mockReturnValue('changePassword');
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {
                [FeatureFlagAnonymousIdHeaderName]: 'anon-user-1',
            };
            delete request.user;
            const executionContext = buildHttpExecutionContext(request);
            featureFlagDomain.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagDomain.validateFeatureFlag).toHaveBeenCalledWith(
                'changePassword',
                null,
                'anon-user-1'
            );
        });

        it('drops an anonymous header that is not a string', async () => {
            reflector.get.mockReturnValue('changePassword');
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {
                [FeatureFlagAnonymousIdHeaderName]: ['anon-user-1'],
            };
            delete request.user;
            const executionContext = buildHttpExecutionContext(request);
            featureFlagDomain.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagDomain.validateFeatureFlag).toHaveBeenCalledWith(
                'changePassword',
                null,
                null
            );
        });

        it('drops an empty anonymous header', async () => {
            reflector.get.mockReturnValue('changePassword');
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = { [FeatureFlagAnonymousIdHeaderName]: '' };
            delete request.user;
            const executionContext = buildHttpExecutionContext(request);
            featureFlagDomain.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagDomain.validateFeatureFlag).toHaveBeenCalledWith(
                'changePassword',
                null,
                null
            );
        });

        it('drops an anonymous header longer than the configured maximum length', async () => {
            reflector.get.mockReturnValue('changePassword');
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {
                [FeatureFlagAnonymousIdHeaderName]: 'a'.repeat(21),
            };
            delete request.user;
            const executionContext = buildHttpExecutionContext(request);
            featureFlagDomain.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagDomain.validateFeatureFlag).toHaveBeenCalledWith(
                'changePassword',
                null,
                null
            );
        });

        it('drops an anonymous header failing the configured pattern', async () => {
            reflector.get.mockReturnValue('changePassword');
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {
                [FeatureFlagAnonymousIdHeaderName]: 'invalid id!',
            };
            delete request.user;
            const executionContext = buildHttpExecutionContext(request);
            featureFlagDomain.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagDomain.validateFeatureFlag).toHaveBeenCalledWith(
                'changePassword',
                null,
                null
            );
        });
    });
});
