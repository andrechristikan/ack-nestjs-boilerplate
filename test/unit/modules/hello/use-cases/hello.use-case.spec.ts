import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { ConfigService } from '@nestjs/config';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { HelloService } from '@modules/hello/services/hello.service';
import { HelloUseCase } from '@modules/hello/use-cases/hello.use-case';

describe('HelloUseCase', () => {
    const helloService: MockProxy<HelloService> = mock<HelloService>();

    let useCase: HelloUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HelloUseCase,
                { provide: HelloService, useValue: helloService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(HelloUseCase);
    });

    describe('execute', () => {
        it('wraps the current date, app identity, and message language in the response envelope', async () => {
            helloService.getApp.mockReturnValue({
                name: 'Ack NestJS Boilerplate',
                env: EnumAppEnvironment.development,
                timezone: 'UTC',
            });
            helloService.getMessage.mockReturnValue({
                availableLanguage: Object.values(EnumMessageLanguage),
                defaultLanguage: EnumMessageLanguage.en,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: {
                    date: {
                        iso: '2026-01-01T00:00:00.000Z',
                        timestamp: 1767225600000,
                    },
                    app: {
                        name: 'Ack NestJS Boilerplate',
                        env: EnumAppEnvironment.development,
                        timezone: 'UTC',
                    },
                    message: {
                        availableLanguage: Object.values(EnumMessageLanguage),
                        defaultLanguage: EnumMessageLanguage.en,
                    },
                },
            });
        });
    });
});
