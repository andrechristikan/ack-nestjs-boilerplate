import { readFileSync } from 'node:fs';

export function buildBlankEnv(keys: string[]): Record<string, string> {
    return Object.fromEntries(keys.map(key => [key, '']));
}

export function readEnvExample(keys: string[]): Record<string, string> {
    const lines = readFileSync('.env.example', 'utf8').split('\n');
    const entries = lines
        .filter(line => line.includes('='))
        .map(line => {
            const index = line.indexOf('=');

            return [line.slice(0, index), line.slice(index + 1)];
        });
    const example = Object.fromEntries(entries);

    return Object.fromEntries(keys.map(key => [key, example[key]]));
}

export function isEveryEnvBlank(env: Record<string, string>): boolean {
    return Object.values(env).every(value => value === '');
}

export function omitKey(keys: string[], key: string): string[] {
    return keys.filter(candidate => candidate !== key);
}
