# NFTStaking-SmartContract
## Overview:

This repository contains a set of smart contracts implementing an NFT staking mechanism, where users can stake their NFTs and earn rewards in the form of ERC20 tokens. The project includes three main contracts:

**NFTCollection:** A standard ERC721 contract representing the NFTs that can be staked.

**RewardsToken:** An ERC20 contract used to reward users for staking their NFTs.

**NFTStaking:** A contract that manages the staking process, including staking, unstaking, and reward distribution.

**Contracts:**

### 1. NFTCollection

A standard ERC721 contract that represents the NFTs that can be staked in the NFTStaking contract.

### 2. RewardsToken

An ERC20 contract that rewards users for staking their NFTs. The contract allows for controlled minting of tokens by authorized controllers.

### 3. NFTStaking

A contract that handles the staking of NFTs, distribution of rewards, and management of unbonding periods. The contract is designed to be upgradeable using the UUPS pattern.

## Features

**NFT Staking:** Users can stake their NFTs and start earning rewards per block.

**Unbonding Period:** Users must wait for a specified unbonding period before they can fully unstake their NFTs.

**Claim Delay:** A delay period is enforced before users can claim their rewards.   

**Upgradeable Contracts:** The NFTStaking contract is designed to be upgradeable using the UUPS pattern, allowing future improvements without changing the contract address.

## Installation:

To set up the development environment, follow these steps:

**1.Clone the Repository:**

`git clone https://github.com/your-repository/nft-staking.git`

`cd nft-staking`

**2.Install Dependencies:**

Make sure you have Node.js and npm installed, then run:

   `npm install`
   
**3.Compile Contracts:**

Compile the smart contracts using Hardhat:

   `npx hardhat compile`
   
**4.Run Tests:**

Run the test suite to ensure everything is working as expected:

  `npx hardhat test
`
## Deployment:

You can deploy the contracts using Hardhat. Below is an example of deploying the contracts to a local network:

**1.start a local blockchain**

    `npx hardhat node`
    
**2.Deploy contracts:**

In a separate terminal, run the deployment script:

   ` npx hardhat run scripts/deploy.js --network localhost`
   
## Usage:

After deployment, you can interact with the contracts using Hardhat tasks or by integrating them into your frontend.

## Interacting via Hardhat Console

**1.start console**

    `npx hardhat console --network localhost`
    
**2.stake an NFT**

    `const nftStaking = await ethers.getContract("NFTStaking");`
    
    `const nftCollection = await ethers.getContract("NFTCollection");
    
``
    // Approve NFT for staking`
    
    `await nftCollection.approve(nftStaking.address, 1);`

    // Stake NFT with ID 1
    
    `await nftStaking.stake([1]);`
    
**3.unstake an NFT**

    // Unstake NFT with ID 1
    
    `await nftStaking.unstake([1]);`


## Contract details;

### Initialization

The NFTStaking contract is upgradeable and should be initialized properly to function. Make sure to use the initialize function instead of a constructor.

`function initialize(
    NFTCollection _nft,
    RewardsToken _token,
    address initialOwner
) public initializer {
    // Initialization logic
}`

## Access control

**Owner:** The contract owner has administrative privileges, including setting parameters like reward rates, unbonding periods, and pausing the contract.

**Controllers:** The RewardsToken contract uses a controller mechanism to allow minting of new tokens only by authorized accounts.

## License.

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements.

[OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) for providing a robust library of reusable smart contract components.

The Ethereum community for continuous development and innovation in the blockchain space.
