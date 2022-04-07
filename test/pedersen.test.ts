import {expect} from "chai";
import buildBabyjub from "circomlibjs";

var pedersen = require('../lib/pedersen');

// pre-generate a bunch of blinding factors
var r = Array(10).fill(null).map((x, i) => i).map(i => pedersen.generateRandom());
console.log(r)

// this is another point of the curve that will be used
//   as the generate points for the hidden values
var H = pedersen.generateH();

describe.only('pedersen babyjub', () => {

    it('should commit to a sum of two values', async() => {

        //transfer amount - we want to transfer 5 tokens    
        var tC = await pedersen.commitTo(H, r[1], 5n);

        // Alice 10 - 5 = 5
        var aC1 = await pedersen.commitTo(H, r[2], 10n);
        var aC2 = await pedersen.sub(aC1, tC);

        // bob 7 + 5 (aC2) = 12
        var bC1 = await pedersen.commitTo(H, r[4], 7n);
        var bC2 = await pedersen.add(bC1, tC);

        // alice's balance to go down by 5
        // aC1 - tC = aC2
        var checkAC2 = await pedersen.subCommitment(H, r[2], r[1], 10n, 5n);
        expect(aC2.equals(checkAC2)).to.eq(true);

        // bob's balance to go up by 5
        // bC1 + tC = bC2 
        var checkBC2 = await pedersen.addCommitment(H, r[4], r[1], 7n, 5n);

        expect(bC2.equals(checkBC2)).to.eq(true);
        
        // verify the commitment
        expect(await pedersen.verify(H, bC2, r[4] + r[1], 7n + 5n)).to.eq(true);
    });

    it('should fail if not using the correct blinding factors', async() => {
        //transfer amount - we want to transfer 5 tokens
        var tC = await pedersen.commitTo(H, r[1], 5n);

        // Alice 10 - 5 = 5
        var aC1 = await pedersen.commitTo(H, r[2], 10n);
        var aC2 = await pedersen.sub(aC1, tC);

        // bob 7 + 5 (aC2) = 12
        var bC1 = await pedersen.commitTo(H, r[4], 7n);
        var bC2 = await pedersen.add(bC1, tC);

        // now to check
        // r[0] -> is not the correct blinding factor
        var checkAC2 = await pedersen.subCommitment(H, r[0], r[1], 10n, 5n);

        expect(aC2.equals(checkAC2)).to.eq(false);
        
        // now to check
        // r[0] -> is not the correct blinding factor
        var checkBC2 = await pedersen.addCommitment(H, r[0], r[1], 7n, 5n);

        expect(bC2.equals(checkBC2)).to.eq(false);
    })
});
