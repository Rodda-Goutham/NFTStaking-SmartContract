import { expect } from "chai";

import hardhat from "hardhat";
const { ethers } = hardhat;


describe("RewardsToken", function () {
    let RewardsToken, rewardsToken, owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        RewardsToken = await ethers.getContractFactory("RewardsToken");
        rewardsToken = await RewardsToken.deploy();
        await rewardsToken.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await rewardsToken.owner()).to.equal(owner.address);
        });

        it("Should have correct name and symbol", async function () {
            expect(await rewardsToken.name()).to.equal("RewardsToken");
            expect(await rewardsToken.symbol()).to.equal("RTK");
        });
    });

    describe("Minting", function () {
        it("Should allow controller to mint tokens", async function () {
            await rewardsToken.addController(owner.address);
            await rewardsToken.mint(addr1.address, 1000);
            expect(Number(await rewardsToken.balanceOf(addr1.address))).to.equal(1000);
        });

        it("Should not allow non-controller to mint tokens", async function () {
            await expect(rewardsToken.mint(addr1.address, 1000)).to.be.revertedWith("Only controllers can mint");
        });
    });

    describe("Burning", function () {
        it("Should allow burning by controller", async function () {
            await rewardsToken.addController(owner.address);
            await rewardsToken.mint(addr1.address, 1000);
            await rewardsToken.burnFrom(addr1.address, 500);
            expect(Number(await rewardsToken.balanceOf(addr1.address))).to.equal(500);
        });

        it("Should allow burning by token owner with allowance", async function () {
            await rewardsToken.addController(owner.address);
            await rewardsToken.mint(addr1.address, 1000);
            await rewardsToken.connect(addr1).approve(addr2.address, 500);
            await rewardsToken.connect(addr2).burnFrom(addr1.address, 500);
            expect(Number(await rewardsToken.balanceOf(addr1.address))).to.equal(500);
        });

        it("Should not allow burning without allowance", async function () {
            await rewardsToken.addController(owner.address);
            await rewardsToken.mint(addr1.address, 1000);
            await expect(
                rewardsToken.connect(addr2).burnFrom(addr1.address, 500)
            ).to.be.revertedWithCustomError(rewardsToken, "ERC20InsufficientAllowance");
        });
    });

    describe("Controllers", function () {
        it("Should add and remove controllers correctly", async function () {
            await rewardsToken.addController(addr1.address);
            expect(await rewardsToken.isController(addr1.address)).to.be.true;

            await rewardsToken.removeController(addr1.address);
            expect(await rewardsToken.isController(addr1.address)).to.be.false;
        });

        it("Should restrict access to controller functions", async function () {
            await expect(
                rewardsToken.connect(addr1).addController(addr2.address)
            ).to.be.revertedWithCustomError(rewardsToken, "OwnableUnauthorizedAccount");
        });
    });
});
