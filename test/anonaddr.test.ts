import {expect} from "chai";
const { utils } = require("ethers");
var EC = require('elliptic').ec;
var ec = new EC('secp256k1');
import { DKSAP } from "../lib/anonymous_address";

const main = () => {
    var keyA = ec.genKeyPair();
    var pubAPoint = keyA.getPublic();
    var pubA = pubAPoint.encode('hex');

    var keyB = ec.genKeyPair();
    var pubBPoint = keyB.getPublic();
    var pubB = pubBPoint.encode('hex');

    let bsap = new DKSAP();

    let newSK = bsap.PrivateKey(keyB.getPrivate().toString("hex"), Buffer.from("12112"), 0, pubA)
    console.log(newSK.getPublic().encode("hex"))
    let pubkey = bsap.PublicKey(pubB, Buffer.from("12112"), 0, keyA.getPrivate().toString("hex"))
    console.log(pubkey)
    expect(newSK.getPublic().encode("hex")).to.eq(pubkey)

    expect(bsap.Verify(pubkey, keyB.getPrivate().toString("hex"), Buffer.from("12112"), 0, pubA)).to.eq(true)
    expect(bsap.Verify(pubkey, keyB.getPrivate().toString("hex"), Buffer.from("12112"), 1, pubA)).to.eq(false)
    expect(bsap.Verify(pubkey, keyB.getPrivate().toString("hex"), Buffer.from("121121"), 0, pubA)).to.eq(false)
    expect(bsap.Verify(pubkey, keyA.getPrivate().toString("hex"), Buffer.from("12112"), 0, pubA)).to.eq(false)

    console.log(bsap.PublickeyToAddress(pubkey))

    let pk2 = "0x043dfddf56028982b8e1ab9279b7487952712f0e08409a46a933f5c52886f129d58706a270294e80637fcf181303b4d2311de9ee47ec57c60a10c0c0886e26a215";
    let address = utils.getAddress("0x78db2f1965916bb49c567c33124674f5d042e85a")
    expect(bsap.PublickeyToAddress(pk2)).to.eq(address);
    let pk3 = "043dfddf56028982b8e1ab9279b7487952712f0e08409a46a933f5c52886f129d58706a270294e80637fcf181303b4d2311de9ee47ec57c60a10c0c0886e26a215";
    expect(bsap.PublickeyToAddress(pk3)).to.eq(address);
}


describe('Anon Address', () => {
    it("BSAP test", () => {
        main()
    })
})
