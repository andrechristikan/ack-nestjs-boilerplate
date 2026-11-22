import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { HelloService } from '@modules/hello/services/hello.service';

describe('HelloService', () => {
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: HelloService;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'app.name': 'Ack NestJS Boilerplate',
                'app.env': EnumAppEnvironment.development,
                'app.timezone': 'UTC',
                'message.availableLanguages':
                    Object.values(EnumMessageLanguage),
                'message.defaultLanguage': EnumMessageLanguage.en,
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HelloService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(HelloService);
    });

    describe('getApp', () => {
        it('returns the app identity and environment read at construction', () => {
            expect(service.getApp()).toEqual({
                name: 'Ack NestJS Boilerplate',
                env: EnumAppEnvironment.development,
                timezone: 'UTC',
            });
        });
    });

    describe('getMessage', () => {
        it('returns the message language configuration read at construction', () => {
            expect(service.getMessage()).toEqual({
                availableLanguage: Object.values(EnumMessageLanguage),
                defaultLanguage: EnumMessageLanguage.en,
            });
        });
    });
});
