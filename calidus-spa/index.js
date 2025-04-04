const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const blake2b = require('blake2b');
const nacl = require('tweetnacl');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const PORT = process.env.PORT;
const NONCE_EXPIRY = 3000000;
const HASH_NONCE_BEFORE_RETURN = false;
const HASH_NONCE_BEFORE_VERIFY = false;

const nonceStore = {};

function generateRawNonce() {
    return crypto.randomBytes(16).toString('hex');
}

function hashNonce(nonce) {
    const nonceBuffer = Buffer.from(nonce, 'utf8');
    const output = Buffer.alloc(32);
    blake2b(32).update(nonceBuffer).digest(output);
    return output.toString('hex');
}

function verifyCalidusSignature(signature, message, publicKeyHex) {
    try {
        console.log('signature',signature)
        const publicKey = Buffer.from(publicKeyHex, 'hex');
        const signatureBytes = Buffer.from(signature, 'hex');
        const messageBytes = Buffer.from(message, 'utf8'); // likely 'utf8' message

        const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey);
        if (!isValid) console.error('❌ Signature verification failed.');
        return isValid;
    } catch (error) {
        console.error('❌ Error during signature verification:', error.message);
        return false;
    }
}

app.post('/request-auth', async (req, res) => {
    const { poolId, calidusKey } = req.body;
    if (!poolId && !calidusKey) {
        return res.status(400).send({ error: 'You must provide either a poolId or a calidusKey.' });
    }

    try {
        let calidusId = calidusKey || null;
        let calidusPubKey = null;

        const params = {
            pool_status: 'eq.registered',
        };
        if (poolId) {
            params.pool_id_bech32 = `eq.${poolId}`;
        } else if (calidusKey) {
            params.calidus_id_bech32 = `eq.${calidusKey}`;
        }

        const response = await axios.get('https://preview.koios.rest/api/v1/pool_calidus_keys', { params });

        if (!response.data.length) {
            return res.status(404).send({ error: 'No valid association found with the provided Pool ID or Calidus Key.' });
        }

        const result = response.data[0];
        calidusPubKey = result.calidus_pub_key;
        if (!calidusPubKey) {
            return res.status(404).send({ error: 'No calidus_pub_key found in the Koios response.' });
        }

        calidusId = result.calidus_id_bech32;

        const rawNonce = generateRawNonce();
        const nonceToReturn = HASH_NONCE_BEFORE_RETURN ? hashNonce(rawNonce) : rawNonce;

        nonceStore[rawNonce] = {
            calidusKey: calidusId,
            calidusPubKey,
            poolId: poolId || null,
            expiresAt: Date.now() + NONCE_EXPIRY
        };

        console.log(`✅ Nonce generated: ${nonceToReturn} for ${calidusId}`);
        return res.status(200).send({
            nonce: nonceToReturn,
            calidusId,
            poolId,
            message: 'Nonce generated successfully. Sign it using your Calidus Key.'
        });

    } catch (error) {
        console.error('❌ Error communicating with Koios API:', error.message);
        return res.status(500).send({
            error: 'Error communicating with Koios API.',
            details: error.message
        });
    }
});

app.post('/verify-signature', (req, res) => {
    const { nonce, calidusKey, signature } = req.body;

    if (!nonce || !calidusKey || !signature) {
        return res.status(400).send({ error: 'Missing required fields: nonce, calidusKey, signature.' });
    }

    const nonceData = nonceStore[nonce];
    if (!nonceData) {
        return res.status(400).send({ error: 'Invalid or expired nonce.' });
    }

    if (Date.now() > nonceData.expiresAt) {
        delete nonceStore[nonce];
        return res.status(400).send({ error: 'Nonce has expired.' });
    }

    if (calidusKey !== nonceData.calidusKey) {
        return res.status(400).send({ error: 'Provided Calidus Key does not match the requested key.' });
    }

    const nonceToVerify = HASH_NONCE_BEFORE_VERIFY ? hashNonce(nonce) : nonce;

    const isValid = verifyCalidusSignature(signature, nonceToVerify, nonceData.calidusPubKey);

    if (!isValid) {
        return res.status(400).send({ error: 'Signature verification failed.' });
    }

    delete nonceStore[nonce];
    console.log(`✅ Authentication successful for Calidus Key: ${calidusKey}`);
    return res.status(200).send({ message: 'Authentication successful!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 SERVICE_API_URL from .env: ${process.env.SERVICE_API_URL}`);
    console.log(`📡 Full API endpoint: ${process.env.SERVICE_API_URL}/api/v1/pool_calidus_keys`);
});