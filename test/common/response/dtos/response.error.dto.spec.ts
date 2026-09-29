import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ResponseErrorSchema } from '@common/response/dtos/response.error.dto';

describe('ResponseErrorSchema', () => {
    const base = {
        statusCode: 40000,
        message: 'error message',
        metadata: {
            language: EnumMessageLanguage.en,
            timestamp: 1660190937231,
            timezone: 'Asia/Jakarta',
            version: '1',
            repoVersion: '1.0.0',
            requestId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
            correlationId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
        },
    };

    it('parses the base envelope with every optional field omitted', () => {
        const result = ResponseErrorSchema.parse(base);

        expect(result).toEqual(base);
    });

    it('parses module, statusCodeKey, and data alongside the base envelope', () => {
        const payload = {
            ...base,
            module: 'user',
            statusCodeKey: 'notFound',
            data: { foo: 'bar' },
        };

        const result = ResponseErrorSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses field-level validation errors', () => {
        const payload = {
            ...base,
            errors: [
                {
                    key: 'tooSmall',
                    property: 'email',
                    message:
                        'email is shorter than the minimum length allowed.',
                },
            ],
        };

        const result = ResponseErrorSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses row-level import errors', () => {
        const payload = {
            ...base,
            errors: [
                {
                    row: 3,
                    errors: [
                        {
                            key: 'tooSmall',
                            property: 'email',
                            message:
                                'email is shorter than the minimum length allowed.',
                        },
                    ],
                },
            ],
        };

        const result = ResponseErrorSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = ResponseErrorSchema.parse({
            ...base,
            secret: 'token',
        });

        expect(result).toEqual(base);
        expect(result).not.toHaveProperty('secret');
    });

    it('rejects an errors value matching neither union member', () => {
        expect(() =>
            ResponseErrorSchema.parse({ ...base, errors: ['not-an-object'] })
        ).toThrow();
    });
});
