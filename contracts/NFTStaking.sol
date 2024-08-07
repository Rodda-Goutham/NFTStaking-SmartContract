// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./NFTCollection.sol";
import "./RewardsToken.sol";
import "./interfaces/INFTStaking.sol";

contract NFTStaking is
    INFTStaking,
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ERC721HolderUpgradeable,
    UUPSUpgradeable
{
    //State variables
    uint256 public totalStaked;
    uint256 public rewardPerBlock;
    uint256 public unbondingPeriod;
    uint256 public claimDelay;

    uint256[] private stakedTokens;

    struct Stake {
        uint24 tokenId;
        uint48 timestamp;
        address owner;
        uint48 claimableTimestamp;
    }

    struct UnbondingInfo {
        address owner;
        uint256 tokenId;
        uint256 unbondingStartTime;
    }

    NFTCollection public nft;
    RewardsToken public token;

    //mappings
    mapping(uint256 => Stake) public vault;

    mapping(address => uint256) public accumulatedRewards;

    mapping(uint256 => bool) public isTokenStaked;

    mapping(uint256 => UnbondingInfo) public unbondingVault;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        NFTCollection _nft,
        RewardsToken _token,
        address initialOwner
    ) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __Pausable_init();
        _transferOwnership(initialOwner);
        __ERC721Holder_init();

        nft = _nft;
        token = _token;
        rewardPerBlock = 0.001 ether;
        unbondingPeriod = 5 days;
        claimDelay = 14 days;
    }

    /**
     * @dev Sets a new reward per block and updates rewards for all stakers.
     */
    function setRewardPerBlock(uint256 newRewardPerBlock) external onlyOwner {
        // Update rewards for all stakers before changing the reward rate
        _updateRewards();
        rewardPerBlock = newRewardPerBlock;
        emit RewardPerBlockUpdated(newRewardPerBlock);
    }

    /**
     * @dev Sets a new unbonding period.
     */
    function setUnbondingPeriod(uint256 newUnbondingPeriod) external onlyOwner {
        unbondingPeriod = newUnbondingPeriod;
        emit UnbondingPeriodUpdated(newUnbondingPeriod);
    }

    /**
     * @dev Sets a new claim delay period.
     */
    function setClaimDelay(uint256 newClaimDelay) external onlyOwner {
        claimDelay = newClaimDelay;
        emit ClaimDelayUpdated(newClaimDelay);
    }

    /**
     * @dev Stakes NFTs by transferring them to the contract and updating state.
     */
    function stake(uint256[] calldata tokenIds) external whenNotPaused {
        uint256 tokenId;

        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];

            require(vault[tokenId].tokenId == 0, "already staked");
            require(nft.ownerOf(tokenId) == msg.sender, "not your token");

            nft.transferFrom(msg.sender, address(this), tokenId);
            emit NFTStaked(msg.sender, tokenId, block.timestamp);

            vault[tokenId] = Stake({
                tokenId: uint24(tokenId),
                timestamp: uint48(block.timestamp),
                owner: msg.sender,
                claimableTimestamp: uint48(block.timestamp) + uint48(claimDelay)
            });

            totalStaked++;

            stakedTokens.push(tokenId); //Push it in to staked tokens

            isTokenStaked[tokenId] = true;
        }
    }

    /**
     * @dev Internal function to handle unstaking of multiple NFTs.
     */
    function _unstakeMany(address account, uint256[] calldata tokenIds) internal {
        uint256 tokenId;

        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            Stake memory staked = vault[tokenId];
            require(staked.owner == msg.sender, "not your token");

            // Move to the pending withdrawal state by storing unbonding information
            unbondingVault[tokenId] = UnbondingInfo({
                owner: account,
                tokenId: tokenId,
                unbondingStartTime: block.timestamp
            });
            totalStaked--;
            delete vault[tokenId];
            isTokenStaked[tokenId] = false;
            emit NFTUnstaked(account, tokenId, block.timestamp);
        }
    }

    /**
     * @dev Completes the unbonding process and transfers NFTs back to the owner.
     */
    function completeUnbonding(uint256[] calldata tokenIds) external {
        uint256 tokenId;

        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            UnbondingInfo memory unbondingInfo = unbondingVault[tokenId];
            require(unbondingInfo.owner == msg.sender, "not an owner");
            require(
                block.timestamp >= unbondingInfo.unbondingStartTime + unbondingPeriod,
                "unbonding period not completed"
            );

            // Transfer the NFT back to the user
            nft.transferFrom(address(this), msg.sender, tokenId);

            // Remove from unbondingVault
            delete unbondingVault[tokenId];
        }
    }

    /**
     * @dev Claims rewards for staked NFTs. Optionally unstakes NFTs.
     */
    function _claim(address account, uint256[] calldata tokenIds, bool _unstake) internal {
        uint256 tokenId;
        uint256 earned = 0;

        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            Stake memory staked = vault[tokenId];
            require(staked.owner == account, "not an owner");
            if (block.timestamp < staked.claimableTimestamp) {
                if (!_unstake) continue;
                // Move to the pending withdrawal state by storing unbonding information
                unbondingVault[tokenId] = UnbondingInfo({
                    owner: account,
                    tokenId: tokenId,
                    unbondingStartTime: block.timestamp
                });

                delete vault[tokenId];
                isTokenStaked[tokenId] = false;
                emit NFTUnstaked(account, tokenId, block.timestamp);
            }
            require(block.timestamp >= staked.claimableTimestamp, "claim delay not reached");
            uint256 stakedAt = staked.timestamp;
            earned += (rewardPerBlock * (block.timestamp - stakedAt)) / 1 days;
            vault[tokenId] = Stake({
                owner: account,
                tokenId: uint24(tokenId),
                timestamp: uint48(block.timestamp),
                claimableTimestamp: uint48(block.timestamp) + uint48(claimDelay)
            });
        }
        earned += accumulatedRewards[account];
        if (earned > 0) {
            token.mint(account, earned);
            accumulatedRewards[account] = 0;
        }
        if (_unstake) {
            _unstakeMany(account, tokenIds);
        }
        emit Claimed(account, earned);
    }

    /**
     * @dev Internal function to update rewards for all stakers.
     */
    function _updateRewards() internal onlyOwner {
        uint256 tokenslength = stakedTokens.length;
        for (uint i = 0; i < tokenslength; i++) {
            uint256 tokenId = stakedTokens[i];
            Stake memory staked = vault[tokenId];
            uint48 stakedAt = staked.timestamp;
            if (isTokenStaked[tokenId]) {
                uint256 earned = (rewardPerBlock * (block.timestamp - stakedAt)) / 1 days;
                accumulatedRewards[staked.owner] += earned;
                staked.timestamp = uint48(block.timestamp);
            }
        }
    }

    /**
     * @dev Public function to claim rewards for staked NFTs.
     */
    function claim(uint256[] calldata tokenIds) external {
        _claim(msg.sender, tokenIds, false);
    }

    /**
     * @dev Public function to claim rewards on behalf of another address.
     */
    function claimForAddress(address account, uint256[] calldata tokenIds) external {
        _claim(account, tokenIds, false);
    }

    /**
     * @dev Public function to unstake NFTs.
     */
    function unstake(uint256[] calldata tokenIds) external {
        _claim(msg.sender, tokenIds, true);
    }

    /**
     * @dev Returns the balance of NFTs staked by a specific account.
     */
    function balanceOf(address account) public view returns (uint256) {
        uint256 balance = 0;
        uint256 supply = nft.totalSupply();
        for (uint i = 1; i <= supply; i++) {
            if (vault[i].owner == account) {
                balance += 1;
            }
        }
        return balance;
    }

    /**
     * @dev Returns the tokens of address given in input .
     */
    function tokensOfOwner(address account) public view returns (uint256[] memory ownerTokens) {
        uint256 supply = nft.totalSupply();
        uint256[] memory tmp = new uint256[](supply);

        uint256 index = 0;
        for (uint tokenId = 1; tokenId <= supply; tokenId++) {
            if (vault[tokenId].owner == account) {
                tmp[index] = vault[tokenId].tokenId;
                index += 1;
            }
        }

        uint256[] memory tokens = new uint256[](index);
        for (uint i = 0; i < index; i++) {
            tokens[i] = tmp[i];
        }

        return tokens;
    }

    function onERC721Received(
        address,
        address from,
        uint256,
        bytes memory
    ) public pure override returns (bytes4) {
        require(from == address(0x0), "Cannot send nfts to Vault directly");
        return IERC721Receiver.onERC721Received.selector;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
