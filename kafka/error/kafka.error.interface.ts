import { IErrors } from 'src/error/error.interface';

export type IErrorKafka = {
    errors?: IErrors[];
    statusCode: number;
    message: string;
};
