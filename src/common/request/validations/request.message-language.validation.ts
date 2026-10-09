import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { z } from 'zod';

/**
 * Message language from the supported languages.
 * @public
 */
export const RequestMessageLanguageSchema = z.enum(EnumMessageLanguage).meta({
    description: 'Message language',
    example: EnumMessageLanguage.en,
});
