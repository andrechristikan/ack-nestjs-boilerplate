import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { LoggerOptionService } from '@common/logger/services/logger.option.service';
import { LoggerUtil } from '@common/logger/utils/logger.util';
import { RequestContextService } from '@common/request/services/request.context.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export interface ILoggerOptionServiceDoubles {
    helperStringService: MockProxy<HelperStringService>;
    helperDateService: MockProxy<HelperDateService>;
    requestContextService: MockProxy<RequestContextService>;
    requestStoreService: MockProxy<RequestStoreService>;
    loggerUtil: MockProxy<LoggerUtil>;
}

export async function createLoggerOptionService(
    configValues: Record<string, unknown>,
    doubles: ILoggerOptionServiceDoubles
): Promise<LoggerOptionService> {
    const configService = buildConfigService(configValues);

    const module = await Test.createTestingModule({
        providers: [
            LoggerOptionService,
            { provide: ConfigService, useValue: configService },
            {
                provide: HelperStringService,
                useValue: doubles.helperStringService,
            },
            { provide: HelperDateService, useValue: doubles.helperDateService },
            {
                provide: RequestContextService,
                useValue: doubles.requestContextService,
            },
            {
                provide: RequestStoreService,
                useValue: doubles.requestStoreService,
            },
            { provide: LoggerUtil, useValue: doubles.loggerUtil },
        ],
    }).compile();

    doubles.loggerUtil.redactValue.mockImplementation(value => value);

    return module.get(LoggerOptionService);
}
