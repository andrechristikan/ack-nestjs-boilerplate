import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { HelloService } from '@modules/hello/services/hello.service';

describe('HelloService', () => {
    const configGet = vi.fn((_key: string): unknown => undefined);
    const configService = {
        get<T>(key: string): T | undefined {
            return configGet(key) as T | undefined;
        },
    } satisfies Pick<ConfigService, 'get'>;

    it('returns app and message metadata from configuration', async () => {
        configGet.mockImplementation((key: string) => {
            const values = {
                'app.name': 'ACK',
                'app.env': EnumAppEnvironment.development,
                'app.timezone': 'UTC',
                'message.availableLanguage': [EnumMessageLanguage.en],
                'message.language': EnumMessageLanguage.en,
            };

            return values[key as keyof typeof values];
        });
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                HelloService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        const service = moduleRef.get(HelloService);

        expect(service.getApp()).toEqual({
            name: 'ACK',
            env: EnumAppEnvironment.development,
            timezone: 'UTC',
        });
        expect(service.getMessage()).toEqual({
            availableLanguage: [EnumMessageLanguage.en],
            defaultLanguage: EnumMessageLanguage.en,
        });
    });
});
