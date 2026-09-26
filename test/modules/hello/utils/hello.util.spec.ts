import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { HelloUtil } from '@modules/hello/utils/hello.util';

describe('HelloUtil', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);

    let service: HelloUtil;

    beforeEach(async () => {
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
                HelloUtil,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = moduleRef.get(HelloUtil);
    });

    it('returns app and message metadata from configuration', async () => {
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
