import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { AuthApiService } from 'src/auth/service/auth.api.service';

@Injectable()
export class AuthApiSeed {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly authApiService: AuthApiService
    ) {}

    @Command({
        command: 'insert:authapis',
        describe: 'insert authapiss',
    })
    async insert(): Promise<void> {
        try {
            await this.authApiService.create({
                name: 'Auth Api Key Migration',
                description: 'From migration',
                key: 'qwertyuiop12345zxcvbnmkjh',
                secret: '5124512412412asdasdasdasdasdASDASDASD',
                passphrase: 'cuwakimacojulawu',
                encryptionKey: 'opbUwdiS1FBsrDUoPgZdx',
            });

            this.debuggerService.debug(
                'Insert Auth Api Succeed',
                'AuthApiSeed',
                'insert'
            );
        } catch (e) {
            this.debuggerService.error(e.message, 'AuthApiSeed', 'insert');
        }
    }

    @Command({
        command: 'remove:authapis',
        describe: 'remove authapis',
    })
    async remove(): Promise<void> {
        try {
            await this.authApiService.deleteOne({
                key: 'qwertyuiop12345zxcvbnmkjh',
            });

            this.debuggerService.debug(
                'Remove Auth Api Succeed',
                'AuthApiSeed',
                'remove'
            );
        } catch (e) {
            this.debuggerService.error(e.message, 'AuthApiSeed', 'remove');
        }
    }
}
