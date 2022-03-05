import {expect} from "chai";

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

    let pubkey = bsap.Publickey(pubB, Buffer.from("12112"), 0, keyA.getPrivate().toString("hex"))
    console.log(pubkey)

    expect(bsap.Verify(pubkey, keyB.getPrivate().toString("hex"), Buffer.from("12112"), 0, pubA)).to.eq(true)
    expect(bsap.Verify(pubkey, keyB.getPrivate().toString("hex"), Buffer.from("12112"), 1, pubA)).to.eq(false)
    expect(bsap.Verify(pubkey, keyB.getPrivate().toString("hex"), Buffer.from("121121"), 0, pubA)).to.eq(false)
    expect(bsap.Verify(pubkey, keyA.getPrivate().toString("hex"), Buffer.from("12112"), 0, pubA)).to.eq(false)
}


describe('Anon Address', () => {
    it("BSAP test", () => {
        main()
    })
})
