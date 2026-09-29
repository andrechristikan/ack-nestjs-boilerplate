import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { HelloHttpService } from '@modules/hello/services/hello.http.service';
import { HelloUtil } from '@modules/hello/utils/hello.util';

describe('HelloHttpService', () => {
    const helloUtil: MockProxy<HelloUtil> = mock<HelloUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const date = new Date('2026-01-01T00:00:00.000Z');

    let service: HelloHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HelloHttpService,
                { provide: HelloUtil, useValue: helloUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = module.get(HelloHttpService);
    });

    describe('hello', () => {
        it('wraps the current date, app identity, and message language in the response envelope', async () => {
            helperDateService.create.mockReturnValue(date);
            helperDateService.formatToIso.mockReturnValue(
                '2026-01-01T00:00:00.000Z'
            );
            helperDateService.getTimestamp.mockReturnValue(date.getTime());
            helloUtil.getApp.mockReturnValue({
                name: 'Ack NestJS Boilerplate',
                env: EnumAppEnvironment.development,
                timezone: 'UTC',
            });
            helloUtil.getMessage.mockReturnValue({
                availableLanguage: Object.values(EnumMessageLanguage),
                defaultLanguage: EnumMessageLanguage.en,
            });

            const result = await service.hello();

            expect(result).toEqual({
                data: {
                    date: {
                        iso: '2026-01-01T00:00:00.000Z',
                        timestamp: date.getTime(),
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
            expect(helperDateService.formatToIso).toHaveBeenCalledWith(date);
            expect(helperDateService.getTimestamp).toHaveBeenCalledWith(date);
        });
    });
});
