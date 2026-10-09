import { faker } from '@faker-js/faker';
import { RequestUserAgentResponseSchema } from '@common/request/dtos/response/request.user-agent.response.dto';

describe('RequestUserAgentResponseSchema', () => {
    const payload = {
        ua: faker.internet.userAgent(),
        browser: {
            name: 'Chrome',
            version: '112.0.5615.49',
            major: '112',
            type: 'mobile',
        },
        cpu: {
            architecture: 'amd64',
        },
        device: {
            type: 'mobile',
            vendor: 'Apple',
            model: 'iPhone',
        },
        engine: {
            name: 'WebKit',
            version: '537.36',
        },
        os: {
            name: 'iOS',
            version: '16.3.1',
        },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = RequestUserAgentResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = RequestUserAgentResponseSchema.parse({
            ...payload,
            extra: 'field',
        });

        expect(result).toEqual(payload);
    });

    it('accepts every group nulled out', () => {
        const nulledPayload = {
            ua: null,
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        };

        const result = RequestUserAgentResponseSchema.parse(nulledPayload);

        expect(result).toEqual(nulledPayload);
    });

    it('accepts a nested field nulled out inside a present group', () => {
        const partialGroupPayload = {
            ...payload,
            browser: {
                name: null,
                version: null,
                major: null,
                type: null,
            },
        };

        const result =
            RequestUserAgentResponseSchema.parse(partialGroupPayload);

        expect(result).toEqual(partialGroupPayload);
    });

    it('rejects a missing required group', () => {
        const { browser: _browser, ...withoutBrowser } = payload;

        expect(() =>
            RequestUserAgentResponseSchema.parse(withoutBrowser)
        ).toThrow();
    });
});
