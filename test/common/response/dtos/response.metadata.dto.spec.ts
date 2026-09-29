import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ResponseMetadataSchema } from '@common/response/dtos/response.metadata.dto';

describe('ResponseMetadataSchema', () => {
    const payload = {
        language: EnumMessageLanguage.en,
        timestamp: 1660190937231,
        timezone: 'Asia/Jakarta',
        version: '1',
        repoVersion: '1.0.0',
        requestId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
        correlationId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ResponseMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = ResponseMetadataSchema.parse({
            ...payload,
            secret: 'token',
        });

        expect(result).toEqual(payload);
        expect(result).not.toHaveProperty('secret');
    });

    it('rejects a missing required field', () => {
        const { requestId: _requestId, ...incomplete } = payload;

        expect(() => ResponseMetadataSchema.parse(incomplete)).toThrow();
    });

    it('rejects a language outside the enum', () => {
        expect(() =>
            ResponseMetadataSchema.parse({ ...payload, language: 'klingon' })
        ).toThrow();
    });
});
