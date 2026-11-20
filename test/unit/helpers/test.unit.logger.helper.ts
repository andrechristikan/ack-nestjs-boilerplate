import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { LoggerOptionService } from '@common/logger/services/logger.option.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

export interface ILoggerOptionServiceDoubles {
    requestContextService: MockProxy<RequestContextService>;
    requestStoreService: MockProxy<RequestStoreService>;
}

export async function createLoggerOptionService(
    configValues: Record<string, unknown>,
    doubles: ILoggerOptionServiceDoubles
): Promise<LoggerOptionService> {
    const configService = buildConfigService({
        ...TestUnitKitConfigValues,
        ...configValues,
    });

    const module = await Test.createTestingModule({
        providers: [
            ...TestUnitKitProviders,
            LoggerOptionService,
            { provide: ConfigService, useValue: configService },
            {
                provide: RequestContextService,
                useValue: doubles.requestContextService,
            },
            {
                provide: RequestStoreService,
                useValue: doubles.requestStoreService,
            },
        ],
    }).compile();

    return module.get(LoggerOptionService);
}
