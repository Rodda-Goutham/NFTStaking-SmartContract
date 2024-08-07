import { expect } from "chai";

import hardhat from "hardhat";
const { ethers } = hardhat;



describe("NFTStaking", function () {
    let NFTStaking, nftStaking, NFTCollection, nftCollection, RewardsToken, rewardsToken;
    let owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy the NFTCollection contract
        NFTCollection = await ethers.getContractFactory("NFTCollection");
        nftCollection = await NFTCollection.deploy();
        await nftCollection.waitForDeployment();

        // Deploy the RewardsToken contract
        RewardsToken = await ethers.getContractFactory("RewardsToken");
        rewardsToken = await RewardsToken.deploy();
        await rewardsToken.waitForDeployment();

        // Deploy the NFTStaking contract
        NFTStaking = await ethers.getContractFactory("NFTStaking");
        nftStaking = await upgrades.deployProxy(NFTStaking, [nftCollection.target, rewardsToken.target, owner.address], {
            initializer: 'initialize',
        });
        await nftStaking.waitForDeployment();

    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await nftStaking.owner()).to.equal(owner.address);
        });

        it("Should have correct initial totalStaked", async function () {
            expect(Number(await nftStaking.totalStaked())).to.equal(0);
        });
    });
    describe("Initialization", function () {
        it("Should correctly initialize contract", async function () {
            expect(await nftStaking.rewardPerBlock()).to.equal(ethers.parseEther("0.001"));
            expect(await nftStaking.unbondingPeriod()).to.equal(5 * 24 * 60 * 60); // 5 days in seconds
            expect(await nftStaking.claimDelay()).to.equal(14 * 24 * 60 * 60); // 14 days in seconds
        });
    });
    describe("Staking NFTs", function () {
        beforeEach(async function () {
            // Mint an NFT for addr1
            await nftCollection.mint(addr1.address, 1);
            // Approve the staking contract to transfer the NFT
            await nftCollection.connect(addr1).approve(nftStaking.target, 1);
        });

        it("Should allow users to stake NFTs", async function () {


            // Stake the NFT
            await nftStaking.connect(addr1).stake([1]);

            // Check that the NFT is staked
            const stake = await nftStaking.vault(1);
            expect(stake.owner).to.equal(addr1.address);
        });

        it("Should emit an event when an NFT is staked", async function () {


            // Expect an event to be emitted
            await expect(nftStaking.connect(addr1).stake([1]))
                .to.emit(nftStaking, "NFTStaked");
        });

        it("Should increase totalStaked when an NFT is staked", async function () {

            await nftStaking.connect(addr1).stake([1]);
            expect(Number(await nftStaking.totalStaked())).to.equal(1);
        });

        it("Should not allow staking the same NFT twice", async function () {

            await nftStaking.connect(addr1).stake([1]);

            await expect(nftStaking.connect(addr1).stake([1])).to.be.revertedWith("already staked");
        });
    });

    describe("Unstaking NFTs", function () {
        beforeEach(async function () {
            // Mint an NFT for addr1 and stake it
            await nftCollection.mint(addr1.address, 1);
            await nftCollection.connect(addr1).approve(nftStaking.target, 1);
            await nftStaking.connect(addr1).stake([1]);
            // Fast-forward time to complete claimDelay
            await ethers.provider.send("evm_increaseTime", [14 * 86400]); // Assuming 14 days claimDelay
            await ethers.provider.send("evm_mine");
            await rewardsToken.addController(nftStaking.target);

        });

        it("Should allow users to unstake NFTs", async function () {
            // Unstake the NFT
            await nftStaking.connect(addr1).unstake([1]);

            // Check that the NFT is unstaked
            const stake = await nftStaking.vault(1);
            expect(stake.owner).to.equal("0x0000000000000000000000000000000000000000");
        });

        it("Should emit an event when an NFT is unstaked", async function () {
            // Expect an event to be emitted
            await expect(nftStaking.connect(addr1).unstake([1]))
                .to.emit(nftStaking, "NFTUnstaked");
        });

        it("Should decrease totalStaked when an NFT is unstaked", async function () {
            await nftStaking.connect(addr1).unstake([1]);
            expect(await nftStaking.totalStaked()).to.equal(0);
        });
    });

    describe("Claiming Rewards", function () {
        beforeEach(async function () {
            // Mint an NFT for addr1 and stake it
            await nftCollection.mint(addr1.address, 1);
            await nftCollection.connect(addr1).approve(nftStaking.target, 1);
            await nftStaking.connect(addr1).stake([1]);
            // Fast-forward time to complete claimDelay
            await ethers.provider.send("evm_increaseTime", [14 * 86400]); // Assuming 14 days claimDelay
            await ethers.provider.send("evm_mine");
            await rewardsToken.addController(nftStaking.target);
        });

        it("Should allow users to claim rewards", async function () {
            // Claim rewards
            await nftStaking.connect(addr1).claim([1]);

            // Check that rewards were minted
            const balance = await rewardsToken.balanceOf(addr1.address);
            expect(balance).to.be.gt(0);
        });

        it("Should emit an event when rewards are claimed", async function () {
            // Expect an event to be emitted
            await expect(nftStaking.connect(addr1).claim([1]))
                .to.emit(nftStaking, "Claimed");
        });
    });

    describe("Pause and Unpause Staking", function () {
        it("Should allow the owner to pause staking", async function () {
            await nftStaking.connect(owner).pause();
            expect(await nftStaking.paused()).to.be.true;
        });

        it("Should prevent staking when paused", async function () {
            await nftStaking.connect(owner).pause();
            await expect(nftStaking.connect(addr1).stake([1])).to.be.revertedWithCustomError(nftStaking, "EnforcedPause()");
        });

        it("Should allow the owner to unpause staking", async function () {
            await nftStaking.connect(owner).pause();
            await nftStaking.connect(owner).unpause();
            expect(await nftStaking.paused()).to.be.false;
        });
    });
    describe("Unbonding Period", function () {
        beforeEach(async function () {
            // Mint and stake an NFT for addr1
            await nftCollection.mint(addr1.address, 1);
            await nftCollection.connect(addr1).approve(nftStaking.target, 1);
            await nftStaking.connect(addr1).stake([1]);
            // Fast-forward time to complete claimDelay
            await ethers.provider.send("evm_increaseTime", [14 * 86400]); // Assuming 14 days claimDelay
            await ethers.provider.send("evm_mine");
            await rewardsToken.addController(nftStaking.target);
        });

        it("Should move NFT to unbonding vault on unstake", async function () {
            await nftStaking.connect(addr1).unstake([1]);

            const unbondingInfo = await nftStaking.unbondingVault(1);
            expect(unbondingInfo.owner).to.equal(addr1.address);
        });

        it("Should allow users to complete unbonding after the period", async function () {
            await nftStaking.connect(addr1).unstake([1]);

            // Fast-forward time to complete unbonding
            await ethers.provider.send("evm_increaseTime", [7 * 86400]); // Assuming 7 days unbonding period
            await ethers.provider.send("evm_mine");

            await nftStaking.connect(addr1).completeUnbonding([1]);

            expect(await nftCollection.ownerOf(1)).to.equal(addr1.address);
        });
    });
    describe("rewardsPerBlock", function () {

        it("Should update reward per block correctly", async function () {
            const newRewardPerBlock = ethers.parseEther("0.01"); // Example new reward rate

            // Update the reward rate
            await nftStaking.setRewardPerBlock(newRewardPerBlock);

            // Check if the rewardPerBlock has been updated
            expect(await nftStaking.rewardPerBlock()).to.equal(newRewardPerBlock);

            // Check if the RewardPerBlockUpdated event was emitted
            await expect(nftStaking.setRewardPerBlock(newRewardPerBlock))
                .to.emit(nftStaking, "RewardPerBlockUpdated")
                .withArgs(newRewardPerBlock);
        });
    })
});
