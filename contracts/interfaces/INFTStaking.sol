// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INFTStaking {
    event NFTStaked(address owner, uint256 tokenId, uint256 value);
    event NFTUnstaked(address owner, uint256 tokenId, uint256 value);
    event Claimed(address owner, uint256 amount);
    event RewardPerBlockUpdated(uint256 newRewardPerBlock);
    event UnbondingPeriodUpdated(uint256 newUnbondingPeriod);
    event ClaimDelayUpdated(uint256 newClaimDelay);


    function setRewardPerBlock(uint256 newRewardPerBlock) external;

    function setUnbondingPeriod(uint256 newUnbondingPeriod) external;

    function setClaimDelay(uint256 newClaimDelay) external;

    function stake(uint256[] calldata tokenIds) external;

    function completeUnbonding(uint256[] calldata tokenIds) external;

    function claim(uint256[] calldata tokenIds) external;

    function claimForAddress(address account, uint256[] calldata tokenIds) external;

    function unstake(uint256[] calldata tokenIds) external;

    function pause() external;

    function unpause() external;
}
