// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {L2NativeSuperchainERC20} from './L2NativeSuperchainERC20.sol';

contract FlashBorrower {
    function onFlashLoan(L2NativeSuperchainERC20 _token, uint256 _amount, uint256 _fee) external returns (bytes32) {
        _token.approve(msg.sender, _amount + _fee);
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}