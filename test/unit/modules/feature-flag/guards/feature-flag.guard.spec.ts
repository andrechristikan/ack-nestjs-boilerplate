import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    FeatureFlagAnonymousIdHeaderName,
    FeatureFlagKeyPathMetaKey,
} from '@modules/feature-flag/constants/feature-flag.constant';
import { EnumFeatureFlagKey } from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';

describe('FeatureFlagGuard', () => {
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
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
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: Reflector, useValue: reflector },
                { provide: RequestStoreService, useValue: requestStoreService },
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
            reflector.get.mockReturnValue(EnumFeatureFlagKey.changePassword);
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {};
            requestStoreService.get.mockReturnValue('507f1f77bcf86cd799439011');
            const executionContext = buildHttpExecutionContext(request);
            featureFlagService.validateFeatureFlag.mockResolvedValue(undefined);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(reflector.get).toHaveBeenCalledWith(
                FeatureFlagKeyPathMetaKey,
                executionContext.getHandler()
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestActorStoreKey
            );
            expect(featureFlagService.validateFeatureFlag).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                '507f1f77bcf86cd799439011',
                null
            );
        });

        it('validates with a null userId when the store holds no actor', async () => {
            reflector.get.mockReturnValue(EnumFeatureFlagKey.changePassword);
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {};
            requestStoreService.get.mockReturnValue(null);
            const executionContext = buildHttpExecutionContext(request);
            featureFlagService.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagService.validateFeatureFlag).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                null,
                null
            );
        });

        it('passes a valid anonymous header through as the anonymousId', async () => {
            reflector.get.mockReturnValue(EnumFeatureFlagKey.changePassword);
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {
                [FeatureFlagAnonymousIdHeaderName]: 'anon-user-1',
            };
            requestStoreService.get.mockReturnValue(null);
            const executionContext = buildHttpExecutionContext(request);
            featureFlagService.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagService.validateFeatureFlag).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                null,
                'anon-user-1'
            );
        });

        it('drops an anonymous header that is not a string', async () => {
            reflector.get.mockReturnValue(EnumFeatureFlagKey.changePassword);
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {
                [FeatureFlagAnonymousIdHeaderName]: ['anon-user-1'],
            };
            requestStoreService.get.mockReturnValue(null);
            const executionContext = buildHttpExecutionContext(request);
            featureFlagService.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagService.validateFeatureFlag).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                null,
                null
            );
        });

        it('drops an empty anonymous header', async () => {
            reflector.get.mockReturnValue(EnumFeatureFlagKey.changePassword);
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = { [FeatureFlagAnonymousIdHeaderName]: '' };
            requestStoreService.get.mockReturnValue(null);
            const executionContext = buildHttpExecutionContext(request);
            featureFlagService.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagService.validateFeatureFlag).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                null,
                null
            );
        });

        it('drops an anonymous header longer than the configured maximum length', async () => {
            reflector.get.mockReturnValue(EnumFeatureFlagKey.changePassword);
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {
                [FeatureFlagAnonymousIdHeaderName]: 'a'.repeat(21),
            };
            requestStoreService.get.mockReturnValue(null);
            const executionContext = buildHttpExecutionContext(request);
            featureFlagService.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagService.validateFeatureFlag).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                null,
                null
            );
        });

        it('drops an anonymous header failing the configured pattern', async () => {
            reflector.get.mockReturnValue(EnumFeatureFlagKey.changePassword);
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.headers = {
                [FeatureFlagAnonymousIdHeaderName]: 'invalid id!',
            };
            requestStoreService.get.mockReturnValue(null);
            const executionContext = buildHttpExecutionContext(request);
            featureFlagService.validateFeatureFlag.mockResolvedValue(undefined);

            await guard.canActivate(executionContext);

            expect(featureFlagService.validateFeatureFlag).toHaveBeenCalledWith(
                EnumFeatureFlagKey.changePassword,
                null,
                null
            );
        });
    });
});
