import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { AuthApiService } from 'src/auth/service/auth.api.service';
import { AuthApiBulkService } from 'src/auth/service/auth.api.bulk.service';

@Injectable()
export class AuthApiSeed {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly authApiService: AuthApiService,
        private readonly authApiBulkService: AuthApiBulkService
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

            this.debuggerService.debug(AuthApiSeed.name, {
                description: 'Insert Auth Api Succeed',
                class: 'AuthApiSeed',
                function: 'insert',
            });
        } catch (e) {
            this.debuggerService.error(AuthApiSeed.name, {
                description: e.message,
                class: 'AuthApiSeed',
                function: 'insert',
            });
        }
    }

    @Command({
        command: 'remove:authapis',
        describe: 'remove authapis',
    })
    async remove(): Promise<void> {
        try {
            await this.authApiBulkService.deleteMany({});

            this.debuggerService.debug(AuthApiSeed.name, {
                description: 'Remove Auth Api Succeed',
                class: 'AuthApiSeed',
                function: 'remove',
            });
        } catch (e) {
            this.debuggerService.error(AuthApiSeed.name, {
                description: e.message,
                class: 'AuthApiSeed',
                function: 'remove',
            });
        }
    }
}
