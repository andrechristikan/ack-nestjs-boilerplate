import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { HelloUtil } from '@modules/hello/utils/hello.util';

describe('HelloUtil', () => {
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let util: HelloUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'app.name': 'Ack NestJS Boilerplate',
                'app.env': EnumAppEnvironment.development,
                'app.timezone': 'UTC',
                'message.availableLanguage': Object.values(EnumMessageLanguage),
                'message.language': EnumMessageLanguage.en,
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HelloUtil,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        util = module.get(HelloUtil);
    });

    describe('getApp', () => {
        it('returns the app identity and environment read at construction', () => {
            expect(util.getApp()).toEqual({
                name: 'Ack NestJS Boilerplate',
                env: EnumAppEnvironment.development,
                timezone: 'UTC',
            });
        });
    });

    describe('getMessage', () => {
        it('returns the message language configuration read at construction', () => {
            expect(util.getMessage()).toEqual({
                availableLanguage: Object.values(EnumMessageLanguage),
                defaultLanguage: EnumMessageLanguage.en,
            });
        });
    });
});
