const { waffle, ethers } = require("hardhat");
import { Wallet, utils, BigNumber, providers } from "ethers"

import { expect } from "chai"

describe("Init test", () => {
    let owner
    let contract
    before(async () => {
        [owner] = await ethers.getSigners();
        let factory = await ethers.getContractFactory("PedersenCommitment")
        contract = await factory.deploy()
        await contract.deployed()
    })
    it("test 1", async() => {
        //TODO
    })
})
