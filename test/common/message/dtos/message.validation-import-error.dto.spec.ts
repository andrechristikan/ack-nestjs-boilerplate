import { MessageValidationImportErrorSchema } from '@common/message/dtos/message.validation-import-error.dto';

describe('MessageValidationImportErrorSchema', () => {
    const payload = {
        row: 3,
        errors: [
            {
                key: 'tooSmall',
                property: 'email',
                message: 'email is shorter than the minimum length allowed.',
            },
        ],
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = MessageValidationImportErrorSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = MessageValidationImportErrorSchema.parse({
            ...payload,
            extra: 'x',
        });

        expect(result).toEqual(payload);
    });

    it('rejects a payload missing a required field', () => {
        expect(() =>
            MessageValidationImportErrorSchema.parse({ row: 3 })
        ).toThrow();
    });
});
