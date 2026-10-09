import { HelloResponseSchema } from '@modules/hello/dtos/response/hello.response.dto';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

describe('HelloResponseSchema', () => {
    const payload = {
        date: {
            iso: '2022-08-10T07:22:17.231Z',
            timestamp: 1660190937231,
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
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = HelloResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = HelloResponseSchema.parse({
            ...payload,
            extra: 'unexpected',
        });

        expect(result).toEqual(payload);
    });

    it('rejects an invalid app environment', () => {
        expect(() =>
            HelloResponseSchema.parse({
                ...payload,
                app: { ...payload.app, env: 'invalid' },
            })
        ).toThrow();
    });

    it('rejects a missing required field', () => {
        const { date: _date, ...withoutDate } = payload;

        expect(() => HelloResponseSchema.parse(withoutDate)).toThrow();
    });
});
