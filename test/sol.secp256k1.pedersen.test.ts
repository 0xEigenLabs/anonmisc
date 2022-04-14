const { waffle, ethers } = require("hardhat");
import { Wallet, utils, BigNumber, providers } from "ethers"

import { expect } from "chai"
var pedersen = require('../lib/pedersen_secp256k1')
const H = pedersen.generateH()

describe("Secp256k1 Pedersen Commitment Test of Solidity Version", () => {
    let owner
    let contract
    before(async () => {
        [owner] = await ethers.getSigners();
        let factory = await ethers.getContractFactory("PedersenCommitmentSecp256k1")
        contract = await factory.deploy()
        await contract.deployed()
    })
    it("should have same results of typescript and solidity", async() => {
        //transfer amount - we want to transfer 5 tokens
        let r1 = pedersen.generateRandom();
        var tC = pedersen.commitTo(H, r1, 5n);

        let soltC = await contract.commitWithH(r1, 5n, BigNumber.from(H.x.toString()), BigNumber.from(H.y.toString()))

        expect(BigNumber.from(tC.x.toString())).to.eq(soltC[0]);
        expect(BigNumber.from(tC.y.toString())).to.eq(soltC[1]);

        // Alice 10 - 5 = 5
        let r2 = await pedersen.generateRandom();
        var aC1 = await pedersen.commitTo(H, r2, 10n);
        var aC2 = await pedersen.sub(aC1, tC);

        // alice's balance to go down by 5
        // aC1 - tC = aC2
        var checkAC2 = await pedersen.subCommitment(H, r2, r1, 10n, 5n);
        expect(aC2.x == checkAC2.x).to.eq(true);
        expect(aC2.y == checkAC2.y).to.eq(true);

        let solAC2 = await contract.subCommitment(r2, BigNumber.from(aC1.x.toString()), BigNumber.from(aC1.y.toString()), r1, BigNumber.from(tC.x.toString()), BigNumber.from(tC.y.toString()))
        // the calculation results of ts and sol should be the same 
        expect(BigNumber.from(aC2.x.toString())).to.eq(solAC2[1]);
        expect(BigNumber.from(aC2.y.toString())).to.eq(solAC2[2]);

        // bob 7 + 5 (aC2) = 12
        let r4 = await pedersen.generateRandom();
        var bC1 = await pedersen.commitTo(H, r4, 7n);
        var bC2 = await pedersen.add(bC1, tC);

        // bob's balance to go up by 5
        // bC1 + tC = bC2
        var checkBC2 = await pedersen.addCommitment(H, r4, r1, 7n, 5n);
        expect(bC2.x == checkBC2.x).to.eq(true);
        expect(bC2.y == checkBC2.y).to.eq(true);

        let solBC2 = await contract.addCommitment(r4, BigNumber.from(bC1.x.toString()), BigNumber.from(bC1.y.toString()), r1, BigNumber.from(tC.x.toString()), BigNumber.from(tC.y.toString()))
        // the calculation results of ts and sol should be the same 
        expect(BigNumber.from(bC2.x.toString())).to.eq(solBC2[1]);
        expect(BigNumber.from(bC2.y.toString())).to.eq(solBC2[2]);

        // verify the commitment
        expect(await pedersen.verify(H, bC2, r4 + r1, 7n + 5n)).to.eq(true);

    })
})
