import crypto from 'crypto';
import fs from 'fs';
import path, { join } from 'path';

class JwtKeysGenerator {
    private readonly keyDir: string;
    private readonly jwksOutputPath: string;
    private readonly accessTokenPrivateKeyPath: string;
    private readonly accessTokenPublicKeyPath: string;
    private readonly refreshTokenPrivateKeyPath: string;
    private readonly refreshTokenPublicKeyPath: string;

    constructor(keyDir: string) {
        this.keyDir = keyDir;
        this.accessTokenPrivateKeyPath = path.join(
            this.keyDir,
            'access-token.pem'
        );
        this.accessTokenPublicKeyPath = path.join(
            this.keyDir,
            'access-token.pub'
        );
        this.refreshTokenPrivateKeyPath = path.join(
            this.keyDir,
            'refresh-token.pem'
        );
        this.refreshTokenPublicKeyPath = path.join(
            this.keyDir,
            'refresh-token.pub'
        );
        this.jwksOutputPath = path.join(this.keyDir, 'jwks.json');
    }

    ensureDir(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    generateES512KeyPair(privateKeyPath: string, publicKeyPath: string): void {
        const keyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        fs.writeFileSync(privateKeyPath, keyPair.privateKey);
        fs.writeFileSync(publicKeyPath, keyPair.publicKey);

        try {
            fs.chmodSync(privateKeyPath, 0o600);
        } catch (err) {
            console.warn(`Could not set permissions for ${privateKeyPath}`);
        }
    }

    extractECParams(publicKeyPath: string): {
        x?: string;
        y?: string;
        crv?: string;
    } {
        try {
            const pemContent = fs.readFileSync(publicKeyPath, 'utf8');
            const publicKey = crypto.createPublicKey({
                key: pemContent,
                format: 'pem',
            });

            const keyDetails = publicKey.export({ format: 'jwk' });

            return {
                x: keyDetails.x,
                y: keyDetails.y,
                crv: keyDetails.crv,
            };
        } catch (error) {
            console.error(
                `Error extracting EC parameters from ${publicKeyPath}: ${error.message}`
            );
            throw error;
        }
    }

    createJwk(
        params: {
            x?: string;
            y?: string;
            crv?: string;
        },
        kid: string
    ): {
        kty: string;
        crv?: string;
        x?: string;
        y?: string;
        use: string;
        alg: string;
        kid: string;
    } {
        return {
            kty: 'EC',
            crv: params.crv,
            x: params.x,
            y: params.y,
            use: 'sig',
            alg: 'ES512',
            kid,
        };
    }

    createJwks(
        accessKeyPath: string,
        refreshKeyPath: string,
        outputPath: string
    ): void {
        try {
            const accessParams = this.extractECParams(accessKeyPath);
            const refreshParams = this.extractECParams(refreshKeyPath);

            // randomly generate a kid for the keys
            const accessKid = crypto.randomBytes(16).toString('hex');
            const refreshKid = crypto.randomBytes(16).toString('hex');
            const accessJwk = this.createJwk(accessParams, accessKid);
            const refreshJwk = this.createJwk(refreshParams, refreshKid);

            const jwks = {
                keys: [accessJwk, refreshJwk],
            };

            const outputDir = path.dirname(outputPath);
            this.ensureDir(outputDir);

            fs.writeFileSync(outputPath, JSON.stringify(jwks, null, 2));
            console.log(`JWKS successfully created at ${outputPath}`);
        } catch (error) {
            console.error(`Error creating JWKS: ${error.message}`);
            throw error;
        }
    }

    generateKeys(): void {
        try {
            this.ensureDir(this.keyDir);

            // Generate access token
            console.log('Generating Access Token ES512 keys...');
            this.generateES512KeyPair(
                this.accessTokenPrivateKeyPath,
                this.accessTokenPublicKeyPath
            );

            // Generate refresh token
            console.log('Generating Refresh Token ES512 keys...');
            this.generateES512KeyPair(
                this.refreshTokenPrivateKeyPath,
                this.refreshTokenPublicKeyPath
            );

            // Generate JWKS
            console.log('Generating JWKS...');
            this.createJwks(
                this.accessTokenPublicKeyPath,
                this.refreshTokenPublicKeyPath,
                this.jwksOutputPath
            );

            console.log('JWT keys and JWKS generated successfully!');
        } catch (err) {
            console.error(`Failed to generate JWT keys: ${err.message}`);
            process.exit(1);
        }
    }

    rollbackKeys(): void {
        try {
            if (fs.existsSync(this.accessTokenPrivateKeyPath)) {
                fs.unlinkSync(this.accessTokenPrivateKeyPath);
            }

            if (fs.existsSync(this.accessTokenPublicKeyPath)) {
                fs.unlinkSync(this.accessTokenPublicKeyPath);
            }

            if (fs.existsSync(this.refreshTokenPrivateKeyPath)) {
                fs.unlinkSync(this.refreshTokenPrivateKeyPath);
            }

            if (fs.existsSync(this.refreshTokenPublicKeyPath)) {
                fs.unlinkSync(this.refreshTokenPublicKeyPath);
            }

            if (fs.existsSync(this.jwksOutputPath)) {
                fs.unlinkSync(this.jwksOutputPath);
            }

            console.log('JWT keys and JWKS removed successfully!');
        } catch (err) {
            console.error(`Failed to remove JWT keys: ${err.message}`);
            process.exit(1);
        }
    }
}

function main() {
    const argv = process.argv.slice(2);
    const command = argv[0] || 'generate';
    const keyDir = argv[1] || join(process.cwd(), 'keys');

    const generator = new JwtKeysGenerator(keyDir);

    if (command === 'generate') {
        generator.generateKeys();
    } else if (command === 'rollback') {
        generator.rollbackKeys();
    } else {
        console.log(`
Usage: node migrate-jwt-keys.js [command] [keysDir]

Commands:
  generate    Generate JWT ES512 keys and JWKS (default)
  rollback    Remove JWT ES512 keys and JWKS

Arguments:
  keysDir     Output directory for keys (default: ./keys)
        `);
    }
}

main();
