import { expect, assert } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;


describe("NFTCollection", function () {
    let NFTCollection, nftCollection, owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy the NFTCollection contract
        NFTCollection = await ethers.getContractFactory("NFTCollection");
        nftCollection = await NFTCollection.deploy();
        await nftCollection.waitForDeployment();;
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await nftCollection.owner()).to.equal(owner.address);
        });

        it("Should have the correct name and symbol", async function () {
            expect(await nftCollection.name()).to.equal("NFTCollection");
            expect(await nftCollection.symbol()).to.equal("NFTC");
        });
    });

    describe("Minting", function () {
        it("Should allow the owner to mint tokens", async function () {
            await nftCollection.mint(addr1.address, 3);
            expect(Number(await nftCollection.balanceOf(addr1.address))).to.equal(3);
        });

        it("Should not allow minting more than the maxMintAmount", async function () {
            await expect(nftCollection.mint(addr1.address, 6)).to.be.revertedWith("ERC721: mint amount exceeds limit");

        });

        it("Should update total supply after minting", async function () {
            await nftCollection.mint(addr1.address, 3);
            expect(Number(await nftCollection.totalSupply())).to.equal(3);


        });

        it("Should not allow minting when paused", async function () {
            await nftCollection.pause(true);
            await expect(nftCollection.mint(addr1.address, 1)).to.be.revertedWith("ERC721: contract is paused");
        });


    });

    describe("Token URI", function () {
        it("Should return the correct token URI", async function () {
            await nftCollection.mint(addr1.address, 1);
            expect(await nftCollection.tokenURI(1)).to.equal("ipfs://QmYB5uWZqfunBq7yWnamTqoXWBAHiQoirNLmuxMzDThHhi/1.json");
        });

        it("Should revert if token does not exist", async function () {
            await expect(nftCollection.tokenURI(1)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");
        });
    });

    describe("Administrative Functions", function () {
        it("Should allow the owner to set max mint amount", async function () {
            await nftCollection.setmaxMintAmount(10);
            expect(Number(await nftCollection.maxMintAmount())).to.equal(10);
        });

        it("Should allow the owner to set base URI", async function () {
            await nftCollection.setBaseURI("ipfs://newBaseURI/");
            expect(await nftCollection.baseURI()).to.equal("ipfs://newBaseURI/");
        });

        it("Should allow the owner to set base extension", async function () {
            await nftCollection.setBaseExtension(".metadata");
            expect(await nftCollection.baseExtension()).to.equal(".metadata");
        });

        it("Should allow the owner to pause and unpause the contract", async function () {
            await nftCollection.pause(true);
            expect(await nftCollection.paused()).to.be.true;
            await nftCollection.pause(false);
            expect(await nftCollection.paused()).to.be.false;
        });

        it("Should allow the owner to withdraw funds", async function () {
            const provider = ethers.provider;
            await addr1.sendTransaction({
                to: nftCollection.target,
                value: ethers.parseEther("1.0")
            });

            const initialOwnerBalance = await provider.getBalance(owner.address);
            await nftCollection.withdraw();
            const finalOwnerBalance = await provider.getBalance(owner.address);

            assert(finalOwnerBalance > initialOwnerBalance);

        });
    });

    describe("Wallet of Owner", function () {
        it("Should return the correct token IDs owned by an address", async function () {
            await nftCollection.mint(addr1.address, 3);
            const tokens = await nftCollection.walletOfOwner(addr1.address);
            expect(tokens.map(t => Number(t))).to.eql([1, 2, 3]);
        });
    });
});
