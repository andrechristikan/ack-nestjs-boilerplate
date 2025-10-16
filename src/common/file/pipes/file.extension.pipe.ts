import {
    Injectable,
    PipeTransform,
    Type,
    UnsupportedMediaTypeException,
    mixin,
} from '@nestjs/common';
import { ENUM_FILE_STATUS_CODE_ERROR } from '@common/file/enums/file.status-code.enum';
import { IFile, IFileInput } from '@common/file/interfaces/file.interface';
import { ENUM_FILE_EXTENSION } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';

/**
 * Creates a dynamic pipe that validates file extensions against allowed types.
 *
 * This factory function creates a mixin pipe that validates uploaded files
 * to ensure they have allowed extensions. It supports both single files
 * and arrays of files.
 *
 * @param {ENUM_FILE_EXTENSION[]} allowedExtensions - Array of allowed file extensions
 * @returns {Type<PipeTransform>} A dynamically created pipe class that validates file extensions
 * @throws {UnsupportedMediaTypeException} When file extension is not in the allowed list
 */
export function FileExtensionPipe(
    allowedExtensions: ENUM_FILE_EXTENSION[]
): Type<PipeTransform> {
    /**
     * Mixin pipe class that validates file extensions.
     *
     * This class implements the PipeTransform interface to validate
     * file extensions against a predefined set of allowed extensions.
     */
    @Injectable()
    class MixinFileTypePipe implements PipeTransform {
        private readonly extensions: ReadonlySet<string> = new Set(
            allowedExtensions
        );

        constructor(private readonly fileService: FileService) {}

        /**
         * Transforms and validates the input file(s) by checking their extensions.
         *
         * This method validates file extensions for both single files and arrays of files.
         * If validation fails, it throws an UnsupportedMediaTypeException.
         *
         * @param {IFileInput} value - The input value containing file(s) to validate
         * @returns {Promise<IFileInput>} The original input value if validation passes
         * @throws {UnsupportedMediaTypeException} When file extension is not allowed
         */
        async transform(value: IFileInput): Promise<IFileInput> {
            if (!value) {
                return value;
            }

            const filesToValidate = this.extractFilesToValidate(value);

            if (!filesToValidate) {
                return value;
            }

            if (Array.isArray(filesToValidate)) {
                this.validateFileArray(filesToValidate);
            } else {
                this.validateSingleFile(filesToValidate);
            }

            return value;
        }

        /**
         * Extracts files from the input value for validation.
         *
         * This method checks if the input value contains files to validate
         * and returns them in the appropriate format.
         *
         * @private
         * @param {IFileInput} value - The input value to extract files from
         * @returns {IFile | IFile[] | null} The extracted file(s) or null if no files to validate
         */
        private extractFilesToValidate(
            value: IFileInput
        ): IFile | IFile[] | null {
            if (this.isEmptyValue(value)) {
                return null;
            }

            return value as IFile | IFile[];
        }

        /**
         * Checks if the provided value is empty or null.
         *
         * This method determines if a value is considered empty by checking
         * for null/undefined, empty objects, or empty arrays.
         *
         * @private
         * @param {unknown} value - The value to check for emptiness
         * @returns {boolean} True if the value is empty, false otherwise
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
         * Validates an array of files by checking each file's extension.
         *
         * This method iterates through an array of files and validates
         * each file's extension against the allowed extensions.
         *
         * @private
         * @param {IFile[]} files - Array of files to validate
         * @throws {UnsupportedMediaTypeException} When any file has an invalid extension
         */
        private validateFileArray(files: IFile[]): void {
            for (const file of files) {
                if (file?.filename) {
                    this.validateExtension(file.filename);
                } else {
                    throw new UnsupportedMediaTypeException({
                        statusCode:
                            ENUM_FILE_STATUS_CODE_ERROR.EXTENSION_INVALID,
                        message: 'file.error.extensionInvalid',
                    });
                }
            }
        }

        /**
         * Validates a single file by checking its extension.
         *
         * This method validates a single file's extension against
         * the allowed extensions list.
         *
         * @private
         * @param {IFile} file - The file to validate
         * @throws {UnsupportedMediaTypeException} When the file has an invalid extension
         */
        private validateSingleFile(file: IFile): void {
            if (file?.filename) {
                this.validateExtension(file.mimetype);
            } else {
                throw new UnsupportedMediaTypeException({
                    statusCode: ENUM_FILE_STATUS_CODE_ERROR.EXTENSION_INVALID,
                    message: 'file.error.extensionInvalid',
                });
            }

            return;
        }

        /**
         * Validates a file extension against the allowed extensions.
         *
         * This method extracts the extension from a filename and checks
         * if it's in the set of allowed extensions.
         *
         * @private
         * @param {string} filename - The filename to extract and validate the extension from
         * @throws {UnsupportedMediaTypeException} When the extension is not allowed
         */
        private validateExtension(filename: string): void {
            const extension =
                this.fileService.extractExtensionFromFilename(filename);

            if (!this.extensions.has(extension)) {
                throw new UnsupportedMediaTypeException({
                    statusCode: ENUM_FILE_STATUS_CODE_ERROR.EXTENSION_INVALID,
                    message: 'file.error.extensionInvalid',
                });
            }

            return;
        }
    }

    return mixin(MixinFileTypePipe);
}
