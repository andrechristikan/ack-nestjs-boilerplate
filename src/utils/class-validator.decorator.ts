import { Transform } from 'class-transformer';

export function Default(defaultValue: any): any {
    return Transform((value: any) =>
        value !== null && value !== undefined ? value : defaultValue
    );
}
