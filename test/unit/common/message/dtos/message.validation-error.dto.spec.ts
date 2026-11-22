import { MessageValidationErrorSchema } from '@common/message/dtos/message.validation-error.dto';

describe('MessageValidationErrorSchema', () => {
    const payload = {
        key: 'tooSmall',
        property: 'email',
        message: 'email is shorter than the minimum length allowed.',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = MessageValidationErrorSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = MessageValidationErrorSchema.parse({
            ...payload,
            extra: 'x',
        });

        expect(result).toEqual(payload);
    });

    it('rejects a payload missing a required field', () => {
        expect(() =>
            MessageValidationErrorSchema.parse({
                key: 'tooSmall',
                property: 'email',
            })
        ).toThrow();
    });
});
