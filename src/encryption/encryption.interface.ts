import {
    IResponseError,
    IResponseSuccess
} from 'src/response/response.interface';

export interface IResponseSuccessEncryption
    extends Omit<IResponseSuccess, 'data'> {
    data: string;
}

export interface IResponseErrorEncryption extends Omit<IResponseError, 'errors'> {
    errors: string;
}
