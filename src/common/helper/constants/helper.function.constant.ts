import ms from 'ms';

export function seconds(msValue: string): number {
    return ms(msValue) / 1000;
}
