import { ENUM_FILE_TYPE } from './file.constant';

export type IFile = Express.Multer.File;

export interface IFileOptions {
    type?: ENUM_FILE_TYPE;
    required?: boolean;
}
