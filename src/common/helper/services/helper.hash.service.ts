import { Injectable } from '@nestjs/common';
import { compare, genSalt, hash } from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';

@Injectable()
export class HelperHashService {
    async bcryptGenerateSalt(length: number): Promise<string> {
        return genSalt(length);
    }

    async bcryptHash(passwordString: string, salt: string): Promise<string> {
        return hash(passwordString, salt);
    }

    async bcryptCompare(
        passwordString: string,
        passwordHashed: string
    ): Promise<boolean> {
        return compare(passwordString, passwordHashed);
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
