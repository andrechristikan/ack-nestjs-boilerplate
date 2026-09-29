import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { RequestMessageLanguageSchema } from '@common/request/validations/request.message-language.validation';

describe('RequestMessageLanguageSchema', () => {
    it('parses a declared message language', () => {
        expect(RequestMessageLanguageSchema.parse(EnumMessageLanguage.en)).toBe(
            EnumMessageLanguage.en
        );
    });

    it('rejects a value outside EnumMessageLanguage', () => {
        expect(() => RequestMessageLanguageSchema.parse('fr')).toThrow();
    });
});
