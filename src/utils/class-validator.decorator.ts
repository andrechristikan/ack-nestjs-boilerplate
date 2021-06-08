import { Transform } from 'class-transformer';

export function Default(
    defaultValue: Record<string, any> | Record<string, any>[] | string | number
): any {
    return Transform((value: any) =>
        value !== null && value !== undefined ? value : defaultValue
    );
}
