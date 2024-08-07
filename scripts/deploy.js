import hardhat from "hardhat";
async function main() {

    const { ethers, upgrades } = hardhat;

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // Deploy NFTCollection contract
    const NFTCollection = await ethers.getContractFactory("NFTCollection");
    const nftCollection = await NFTCollection.deploy();
    await nftCollection.waitForDeployment();
    console.log("NFTCollection deployed to:", nftCollection.target);

    // Deploy RewardsToken contract
    const RewardsToken = await ethers.getContractFactory("RewardsToken");
    const rewardsToken = await RewardsToken.deploy();
    await rewardsToken.waitForDeployment();
    console.log("RewardsToken deployed to:", rewardsToken.target);

    // Deploy NFTStaking contract using deployProxy
    const NFTStaking = await ethers.getContractFactory("NFTStaking");
    const nftStaking = await upgrades.deployProxy(NFTStaking, [nftCollection.target, rewardsToken.target, deployer.address], {
        initializer: 'initialize',
    });
    await nftStaking.waitForDeployment();
    console.log("NFTStaking deployed to:", nftStaking.target);

    console.log("NFTStaking contract set");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
