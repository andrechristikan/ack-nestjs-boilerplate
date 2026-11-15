import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { argon2, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { HelperHashArgon2PhcRegex } from '@common/helper/constants/helper.constant';
import type { IHelperHashArgon2Parameters } from '@common/helper/interfaces/helper.interface';
import type { IConfigHelperArgon2 } from '@configs/helper.config';

@Injectable()
export class HelperHashService {
    private readonly argon2: IConfigHelperArgon2;
    private readonly argon2MemoryInKib: number;

    constructor(private readonly configService: ConfigService) {
        this.argon2 =
            this.configService.get<IConfigHelperArgon2>('helper.argon2')!;
        this.argon2MemoryInKib = this.argon2.memoryInBytes / 1024;
    }

    private async deriveArgon2(
        parameters: IHelperHashArgon2Parameters
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            argon2('argon2id', parameters, (error, derivedKey) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(derivedKey);
            });
        });
    }

    async argon2Hash(value: string): Promise<string> {
        const { passes, parallelism, saltLength, tagLength } = this.argon2;
        const salt = randomBytes(saltLength);
        const tag = await this.deriveArgon2({
            message: value,
            nonce: salt,
            parallelism,
            tagLength,
            memory: this.argon2MemoryInKib,
            passes,
        });

        return `$argon2id$v=19$m=${this.argon2MemoryInKib},t=${passes},p=${parallelism}$${salt.toString('base64').replace(/=+$/, '')}$${tag.toString('base64').replace(/=+$/, '')}`;
    }

    async argon2Compare(value: string, hash: string): Promise<boolean> {
        const match = HelperHashArgon2PhcRegex.exec(hash);
        if (match === null) {
            return false;
        }

        const [, memory, passes, parallelism, salt, tag] = match;
        const expected = Buffer.from(tag!, 'base64');
        const actual = await this.deriveArgon2({
            message: value,
            nonce: Buffer.from(salt!, 'base64'),
            parallelism: Number(parallelism!),
            tagLength: expected.length,
            memory: Number(memory!),
            passes: Number(passes!),
        });

        return timingSafeEqual(actual, expected);
    }

    sha256Hash(value: string): string {
        return createHash('sha256').update(value, 'utf8').digest('hex');
    }

    sha256Compare(hashOne: string, hashTwo: string): boolean {
        const one = Buffer.from(hashOne, 'utf8');
        const two = Buffer.from(hashTwo, 'utf8');

        return one.length === two.length && timingSafeEqual(one, two);
    }
}
