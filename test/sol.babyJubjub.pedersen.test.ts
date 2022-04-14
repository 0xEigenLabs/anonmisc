const { waffle, ethers } = require("hardhat");
import { Wallet, utils, BigNumber, providers } from "ethers"
import {buildBabyjub} from "circomlibjs";
var pedersen = require('../lib/pedersen_babyJubjub');

import { assert, expect } from "chai"

describe("Baby Jubjub Pedersen Commitment Test of Solidity Version", () => {
    let owner
    let contract
    let babyjub
    let babyjubsol
    let H
    before(async () => {
        [owner] = await ethers.getSigners();
        let factory = await ethers.getContractFactory("PedersenCommitmentBabyJubjub")
        contract = await factory.deploy()
        await contract.deployed()

        factory = await ethers.getContractFactory("BabyJubjub")
        babyjubsol = await factory.deploy()
        await babyjubsol.deployed()

        babyjub = await buildBabyjub();
        H = await pedersen.generateH()
    })
    it("Should add 2 same numbers", () => {
        const p1 = [
            babyjub.F.e("17777552123799933955779906779655732241715742912184938656739573121738514868268"),
            babyjub.F.e("2626589144620713026669568689430873010625803728049924121243784502389097019475"),
        ];
        const p2 = [
            babyjub.F.e("16540640123574156134436876038791482806971768689494387082833631921987005038935"),
            babyjub.F.e("20819045374670962167435360035096875258406992893633759881276124905556507972311"),
        ];

        const out = babyjub.addPoint(p1, p2);
        assert(babyjub.F.eq(out[0], babyjub.F.e("7916061937171219682591368294088513039687205273691143098332585753343424131937")));
        assert(babyjub.F.eq(out[1], babyjub.F.e("14035240266687799601661095864649209771790948434046947201833777492504781204499")));
    });

    it("should on Curve 1", () => {
        const p = [
            babyjub.F.e("16540640123574156134436876038791482806971768689494387082833631921987005038935"),
            babyjub.F.e("20819045374670962167435360035096875258406992893633759881276124905556507972311"),
        ];
        assert(babyjub.inCurve(p));
    });

    it("should on Curve 1 in sol", async () => {
        const p = [
            ("16540640123574156134436876038791482806971768689494387082833631921987005038935"),
            ("20819045374670962167435360035096875258406992893633759881276124905556507972311"),
        ];

        assert(await babyjubsol.afOnCurve(p));
    });

    it("should add 2 same numbers in solidity", async() => {
        const p1 = [
            BigNumber.from("17777552123799933955779906779655732241715742912184938656739573121738514868268"),
            BigNumber.from("2626589144620713026669568689430873010625803728049924121243784502389097019475"),
        ];
        const p2 = [
            BigNumber.from("16540640123574156134436876038791482806971768689494387082833631921987005038935"),
            BigNumber.from("20819045374670962167435360035096875258406992893633759881276124905556507972311"),
        ];

        const out = await babyjubsol.eAdd(p1[0], p1[1], p2[0], p2[1]);

        expect(out[0]).to.eq(BigNumber.from("7916061937171219682591368294088513039687205273691143098332585753343424131937"))
        expect(out[1]).to.eq(BigNumber.from("14035240266687799601661095864649209771790948434046947201833777492504781204499"))
    })

    it("should have same results of typescript and solidity", async() => {
        //transfer amount - we want to transfer 5 tokens
        let r1 = await pedersen.generateRandom();
        var tC = await pedersen.commitTo(H, r1, 5n);

        // FIXME not graceful to convert between F and string
        //let r1s = babyjub.F.toString(r1)
        // the calculation results of ts and sol should be the same 
        let soltC = await contract.commitWithH(r1, 5n, babyjub.F.toString(H[0]), babyjub.F.toString(H[1]))

        expect(babyjub.F.toString(tC[0])).to.eq(soltC[0]);
        expect(babyjub.F.toString(tC[1])).to.eq(soltC[1]);

        // Alice 10 - 5 = 5
        let r2 = await pedersen.generateRandom();
        var aC1 = await pedersen.commitTo(H, r2, 10n);
        var aC2 = await pedersen.sub(aC1, tC);

        // alice's balance to go down by 5
        // aC1 - tC = aC2
        var checkAC2 = await pedersen.subCommitment(H, r2, r1, 10n, 5n);
        expect(babyjub.F.eq(aC2[0], checkAC2[0])).to.eq(true);
        expect(babyjub.F.eq(aC2[1], checkAC2[1])).to.eq(true);

        let solAC2 = await contract.subCommitment(r2, babyjub.F.toString(aC1[0]), babyjub.F.toString(aC1[1]), r1, babyjub.F.toString(tC[0]), babyjub.F.toString(tC[1]))
        // the calculation results of ts and sol should be the same 
        expect(babyjub.F.toString(aC2[0])).to.eq(solAC2[1]);
        expect(babyjub.F.toString(aC2[1])).to.eq(solAC2[2]);

        // bob 7 + 5 (aC2) = 12
        let r4 = await pedersen.generateRandom();
        var bC1 = await pedersen.commitTo(H, r4, 7n);
        var bC2 = await pedersen.add(bC1, tC);

        // bob's balance to go up by 5
        // bC1 + tC = bC2
        var checkBC2 = await pedersen.addCommitment(H, r4, r1, 7n, 5n);
        expect(babyjub.F.eq(bC2[0], checkBC2[0])).to.eq(true);
        expect(babyjub.F.eq(bC2[1], checkBC2[1])).to.eq(true);

        let solBC2 = await contract.addCommitment(r4, babyjub.F.toString(bC1[0]), babyjub.F.toString(bC1[1]), r1, babyjub.F.toString(tC[0]), babyjub.F.toString(tC[1]))
        // the calculation results of ts and sol should be the same 
        expect(babyjub.F.toString(bC2[0])).to.eq(solBC2[1]);
        expect(babyjub.F.toString(bC2[1])).to.eq(solBC2[2]);

        // verify the commitment
        expect(await pedersen.verify(H, bC2, r4 + r1, 7n + 5n)).to.eq(true);

    })
})
