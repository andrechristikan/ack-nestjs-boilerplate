import {
    Injectable,
    PipeTransform,
    Type,
    UnsupportedMediaTypeException,
    mixin,
} from '@nestjs/common';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { IFile, IFileInput } from '@common/file/interfaces/file.interface';
import { EnumFileExtension } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';

/**
 * Factory function to create a dynamic NestJS pipe for validating file extensions.
 *
 * Returns a mixin pipe class that checks if uploaded file(s) have extensions in the allowed list.
 * Supports both single file and array input (if extended).
 *
 * @param {EnumFileExtension[]} allowedExtensions - Array of allowed file extensions
 * @returns {Type<PipeTransform>} A NestJS pipe class for file extension validation
 * @throws {UnsupportedMediaTypeException} If file extension is not allowed
 */
export function FileExtensionPipe(
    allowedExtensions: EnumFileExtension[]
): Type<PipeTransform> {
    /**
     * Pipe class for validating file extensions using the allowed list.
     *
     * @class
     * @implements {PipeTransform}
     */
    @Injectable()
    class MixinFileExtensionPipe implements PipeTransform {
        /**
         * Set of allowed file extensions for validation.
         * @type {ReadonlySet<string>}
         * @readonly
         */
        private readonly extensions: ReadonlySet<string> = new Set(
            allowedExtensions
        );

        /**
         * @param {FileService} fileService - FileService instance for extracting file extension
         */
        constructor(private readonly fileService: FileService) {}

        /**
         * Validates the extension of the input file.
         * Returns the original value if validation passes.
         *
         * @param {IFileInput} value - The file to validate
         * @returns {Promise<IFileInput>} The original value if validation passes
         * @throws {UnsupportedMediaTypeException} If file extension is not allowed
         */
        async transform(value: IFileInput): Promise<IFileInput> {
            if (!value) {
                return value;
            }
            const fileToValidate = this.extractFilesToValidate(value);
            if (!fileToValidate) {
                return value;
            }
            this.validate(fileToValidate);
            return value;
        }

        /**
         * Extracts a file from the input value for validation.
         * Returns null if the value is empty.
         *
         * @private
         * @param {IFileInput} value - The input value to extract file from
         * @returns {IFile | null} The extracted file or null if empty
         */
        private extractFilesToValidate(value: IFileInput): IFile | null {
            if (this.isEmptyValue(value)) {
                return null;
            }
            return value as IFile;
        }

        /**
         * Checks if the provided value is empty (null, undefined, empty object, or empty array).
         *
         * @private
         * @param {unknown} value - The value to check
         * @returns {boolean} True if empty, false otherwise
         */
        private isEmptyValue(value: unknown): boolean {
            return (
                !value ||
                (typeof value === 'object' &&
                    !Array.isArray(value) &&
                    Object.keys(value).length === 0) ||
                (Array.isArray(value) && value.length === 0)
            );
        }

        /**
         * Validates a file's extension against the allowed list.
         * Throws an exception if the extension is not allowed.
         *
         * @private
         * @param {IFile} file - The file to validate
         * @throws {UnsupportedMediaTypeException} If extension is not allowed
         */
        private validate(file: IFile): void {
            if (!file?.originalname) {
                throw new UnsupportedMediaTypeException({
                    statusCode: EnumFileStatusCodeError.extensionInvalid,
                    message: 'file.error.extensionInvalid',
                });
            }
            this.validateExtension(file.originalname);
        }

        /**
         * Validates a file extension against the allowed extensions.
         * Throws an exception if the extension is not allowed.
         *
         * @private
         * @param {string} originalname - The filename to extract and validate extension from
         * @throws {UnsupportedMediaTypeException} If extension is not allowed
         */
        private validateExtension(originalname: string): void {
            const extension =
                this.fileService.extractExtensionFromFilename(originalname);
            if (!this.extensions.has(extension)) {
                throw new UnsupportedMediaTypeException({
                    statusCode: EnumFileStatusCodeError.extensionInvalid,
                    message: 'file.error.extensionInvalid',
                });
            }
        }
    }

    return mixin(MixinFileExtensionPipe);
}
