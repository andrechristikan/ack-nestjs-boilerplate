import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ResponseSchema } from '@common/response/dtos/response.dto';

describe('ResponseSchema', () => {
    const payload = {
        statusCode: 200,
        message: 'message endpoint',
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

    it('parses a payload into exactly the declared fields', () => {
        const result = ResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = ResponseSchema.parse({ ...payload, data: 'leak' });

        expect(result).toEqual(payload);
        expect(result).not.toHaveProperty('data');
    });

    it('rejects a missing required field', () => {
        const { message: _message, ...incomplete } = payload;

        expect(() => ResponseSchema.parse(incomplete)).toThrow();
    });
});
