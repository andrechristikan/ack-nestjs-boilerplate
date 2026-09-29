import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';

/**
 * Metadata key carrying the i18n message path from the `@Response`/`@ResponsePagination`
 * decorators to their interceptors.
 * @public
 */
export const ResponseMessagePathMetaKey = 'ResponseMessagePathMetaKey';

/**
 * Metadata key carrying the response payload schema from the `@Response`/`@ResponsePagination`
 * decorators to their interceptors.
 * @public
 */
export const ResponseSchemaMetaKey = 'ResponseSchemaMetaKey';

/**
 * Media type a `@ResponseFile` download publishes for each document extension.
 * @public
 */
export const ResponseFileMediaTypes: Record<EnumFileExtensionDocument, string> =
    {
        [EnumFileExtensionDocument.csv]: 'text/csv',
        [EnumFileExtensionDocument.pdf]: 'application/pdf',
    };
