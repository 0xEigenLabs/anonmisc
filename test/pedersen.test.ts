import {expect} from "chai";

var pedersen = require('../lib/pedersen');
var EC = require('elliptic').ec;
var ec = new EC('secp256k1');

// pre-generate a bunch of blinding factors
var r = Array(10).fill(null).map((x, i) => i).map(i => pedersen.generateRandom());

// this is another point of the curve that will be used
//   as the generate points for the hidden values
var H = pedersen.generateH();

describe('pedersen', () => {

    it('should commit to a sum of two values', () => {

        //transfer amount - we want to transfer 5 tokens    
        var tC = pedersen.commitTo(H, r[1], 5);

        // Alice 10 - 5 = 5
        var aC1 = pedersen.commitTo(H, r[2], 10);
        var aC2 = pedersen.sub(aC1, tC);

        // bob 7 + 5 (aC2) = 12
        var bC1 = pedersen.commitTo(H, r[4], 7);
        var bC2 = pedersen.add(bC1, tC);

        // alice's balance to go down by 5
        // aC1 - tC = aC2
        var checkAC2 = pedersen.subCommitment(H, r[2], r[1], 10, 5);
        expect(aC2.eq(checkAC2)).to.eq(true);

        // bob's balance to go up by 5
        // bC1 + tC = bC2 
        var checkBC2 = pedersen.addCommitment(H, r[4], r[1], 7, 5);

        expect(bC2.eq(checkBC2)).to.eq(true);
        
        // verify the commitment
        expect(pedersen.verify(H, bC2, r[4].add(r[1]), 7 + 5)).to.eq(true);
    });

    it('should fail if not using the correct blinding factors', () => {
        //transfer amount - we want to transfer 5 tokens
        var tC = pedersen.commitTo(H, r[1], 5);

        // Alice 10 - 5 = 5
        var aC1 = pedersen.commitTo(H, r[2], 10);
        var aC2 = pedersen.sub(aC1, tC);

        // bob 7 + 5 (aC2) = 12
        var bC1 = pedersen.commitTo(H, r[4], 7);
        var bC2 = pedersen.add(bC1, tC);

        // now to check
        // r[0] -> is not the correct blinding factor
        var checkAC2 = pedersen.subCommitment(H, r[0], r[1], 10, 5);

        expect(aC2.eq(checkAC2)).to.eq(false);
        
        // now to check
        // r[0] -> is not the correct blinding factor
        var checkBC2 = pedersen.addCommitment(H, r[0], r[1], 7, 5);

        expect(bC2.eq(checkBC2)).to.eq(false);
    })
});
