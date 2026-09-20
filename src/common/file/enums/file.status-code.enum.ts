/**
 * Status codes raised by the `file` kit.
 * @public
 */
export enum EnumFileStatusCodeError {
    required = 50100,
    extensionInvalid = 50101,
    requiredExtractFirst = 50102,
    exceedMaxDataImport = 50103,
    exceedMaxDataExport = 50104,
    exceedMaxSizeExport = 50105,
    exceedMaxSizeUpload = 50106,
    exceedMaxFiles = 50107,
    fieldUnexpected = 50108,
    multipartInvalid = 50109,
}
