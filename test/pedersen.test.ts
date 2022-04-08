import {expect} from "chai";
import {buildBabyjub} from "circomlibjs";
var pedersen = require('../lib/pedersen');

let babyjub
let H

describe.only('pedersen babyjub', () => {
    before(async () => {
        babyjub = await buildBabyjub();
        H = await pedersen.generateH();
    });

    it('should commit to a sum of two values', async() => {
        //transfer amount - we want to transfer 5 tokens    
        let r1 = await pedersen.generateRandom();
        var tC = await pedersen.commitTo(H, r1, 5n);

        // Alice 10 - 5 = 5
        let r2 = await pedersen.generateRandom();
        var aC1 = await pedersen.commitTo(H, r2, 10n);
        var aC2 = await pedersen.sub(aC1, tC);

        // bob 7 + 5 (aC2) = 12
        let r4 = await pedersen.generateRandom();
        var bC1 = await pedersen.commitTo(H, r4, 7n);
        var bC2 = await pedersen.add(bC1, tC);

        // alice's balance to go down by 5
        // aC1 - tC = aC2
        var checkAC2 = await pedersen.subCommitment(H, r2, r1, 10n, 5n);
        expect(babyjub.F.eq(aC2[0], checkAC2[0])).to.eq(true);
        expect(babyjub.F.eq(aC2[1], checkAC2[1])).to.eq(true);

        // bob's balance to go up by 5
        // bC1 + tC = bC2 
        var checkBC2 = await pedersen.addCommitment(H, r4, r1, 7n, 5n);

        expect(babyjub.F.eq(bC2[0], checkBC2[0])).to.eq(true);
        expect(babyjub.F.eq(bC2[1], checkBC2[1])).to.eq(true);
        
        // verify the commitment
        expect(await pedersen.verify(H, bC2, r4 + r1, 7n + 5n)).to.eq(true);
    });

    it('should fail if not using the correct blinding factors', async() => {
        //transfer amount - we want to transfer 5 tokens
        let r1 = await pedersen.generateRandom();
        var tC = await pedersen.commitTo(H, r1, 5n);

        // Alice 10 - 5 = 5
        let r2 = await pedersen.generateRandom();
        var aC1 = await pedersen.commitTo(H, r2, 10n);
        var aC2 = await pedersen.sub(aC1, tC);

        // bob 7 + 5 (aC2) = 12
        let r4 = await pedersen.generateRandom();
        var bC1 = await pedersen.commitTo(H, r4, 7n);
        var bC2 = await pedersen.add(bC1, tC);

        // now to check
        // r[0] -> is not the correct blinding factor
        let r0 = await pedersen.generateRandom();
        var checkAC2 = await pedersen.subCommitment(H, r0, r1, 10n, 5n);

        expect(babyjub.F.eq(aC2[0], checkAC2[0])).to.eq(false);
        expect(babyjub.F.eq(aC2[1], checkAC2[1])).to.eq(false);
        
        // now to check
        // r[0] -> is not the correct blinding factor
        var checkBC2 = await pedersen.addCommitment(H, r0, r1, 7n, 5n);

        expect(babyjub.F.eq(bC2[0], checkBC2[0])).to.eq(false);
        expect(babyjub.F.eq(bC2[1], checkBC2[1])).to.eq(false);
    })
});
