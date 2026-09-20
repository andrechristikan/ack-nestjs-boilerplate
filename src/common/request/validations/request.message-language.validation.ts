import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { z } from 'zod';

export const RequestMessageLanguageSchema = z.enum(EnumMessageLanguage).meta({
    description: 'Message language',
    example: EnumMessageLanguage.en,
});
