var EC = require('elliptic').ec;
var ec = new EC('secp256k1');
var BN = require('bn.js');
import * as crypto from 'crypto';
const {
    utils
} = require("ethers");

/**
 * Interface for generation and verify the anonymous address
 */
export interface AnonymousAddress {
    PublicKey(receiverPublicKeyHex: string, message: Buffer, nonce: number, senderPrivateKeyHex: string): string
    PrivateKey(receiverPrivateKeyHex: string, message: Buffer, nonce: number, senderPublicKeyHex: string): any;
    Verify(pubkey: string, receivePrivateKeyHex: string, message: Buffer, nonce: number, senderPublicKeyHex: string): boolean
    PublickeyToAddress(pubkeyHex: string): string;
}

/**
 * DKSAP is implement of https://arxiv.org/pdf/1806.00951.pdf
 */
export class DKSAP implements AnonymousAddress {

    /**
     * called by sender
     */
    PublicKey(receiverPublicKeyHex: string, message: Buffer, nonce: number, senderPrivateKeyHex: string): string {
        var receiverPublicKey = ec.keyFromPublic(receiverPublicKeyHex, 'hex');
        let senderPrivateKey = ec.keyFromPrivate(senderPrivateKeyHex, "hex")
        var shared1 = senderPrivateKey.derive(receiverPublicKey.getPublic());
        var shareHash = crypto.createHash('sha256').update(shared1.toString("hex")).digest('hex');
        var txHash = crypto.createHash('sha256').update(message.toString("hex")).digest('hex');
        let finalMessage = shareHash.concat(txHash).concat(nonce.toString());
        var finalHash = crypto.createHash('sha256').update(finalMessage).digest('hex');
        let tmpKey = ec.keyFromPrivate(finalHash, "hex")
        return receiverPublicKey.getPublic().add(tmpKey.getPublic()).encode("hex")
    }

    /**
     * call by receiver
     */
    PrivateKey(receiverPrivateKeyHex: string, message: Buffer, nonce: number, senderPublicKeyHex: string): any {
        var senderPublicKey = ec.keyFromPublic(senderPublicKeyHex, 'hex');
        let receiverPrivateKey = ec.keyFromPrivate(receiverPrivateKeyHex, "hex")
        var shared1 = receiverPrivateKey.derive(senderPublicKey.getPublic());
        var shareHash = crypto.createHash('sha256').update(shared1.toString("hex")).digest('hex');
        var txHash = crypto.createHash('sha256').update(message.toString("hex")).digest('hex');
        let finalMessage = shareHash.concat(txHash).concat(nonce.toString());
        var finalHash = crypto.createHash('sha256').update(finalMessage).digest('hex');
        console.log(receiverPrivateKeyHex, "||", finalHash)
        let newSK = new BN(receiverPrivateKeyHex, 16).add(new BN(finalHash, 16))
        return ec.keyFromPrivate(newSK)
    }

    /**
     * call by receiver
     */
    Verify(pubkey: string, receiverPrivateKeyHex: string, message: Buffer, nonce: number, senderPublicKeyHex: string): boolean {
        var senderPublicKey = ec.keyFromPublic(senderPublicKeyHex, 'hex');
        let receiverPrivateKey = ec.keyFromPrivate(receiverPrivateKeyHex, "hex")
        var shared1 = receiverPrivateKey.derive(senderPublicKey.getPublic());
        var shareHash = crypto.createHash('sha256').update(shared1.toString("hex")).digest('hex');
        var txHash = crypto.createHash('sha256').update(message.toString("hex")).digest('hex');
        let finalMessage = shareHash.concat(txHash).concat(nonce.toString());
        var finalHash = crypto.createHash('sha256').update(finalMessage).digest('hex');
        let tmpKey = ec.keyFromPrivate(finalHash, "hex")
        let vPubkey = receiverPrivateKey.getPublic().add(tmpKey.getPublic()).encode("hex")
        return vPubkey == pubkey;
    }

    PublickeyToAddress(pubkeyHex: string): string {
        if (pubkeyHex.slice(0,2) != "0x") {
            pubkeyHex = "0x" + pubkeyHex;
        }
        let address = utils.computeAddress(pubkeyHex)
        return address;
    }
}


