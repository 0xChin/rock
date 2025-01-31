// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {L2NativeSuperchainERC20} from './L2NativeSuperchainERC20.sol';

interface IFlashBorrower {
    /**
     * @dev Receive a flash loan.
     * @param _token The loan currency.
     * @param _amount The amount of tokens lent.
     * @param _fee The additional amount of tokens to repay.
     * @return The keccak256 hash of "ERC3156FlashBorrower.onFlashLoan"
     */
    function onFlashLoan(
        L2NativeSuperchainERC20 _token,
        uint256 _amount,
        uint256 _fee
    ) external returns (bytes32);
}


contract Pool {
    bytes32 public constant CALLBACK_SUCCESS = keccak256('ERC3156FlashBorrower.onFlashLoan');

    error Pool_CallbackFailed();

    L2NativeSuperchainERC20 public immutable token;
    mapping(address => uint256) public depositsOf;

    constructor(L2NativeSuperchainERC20 _token) {
        token = _token;
    }

    function deposit(uint256 _amount) external {
        token.transferFrom(msg.sender, address(this), _amount);
        depositsOf[msg.sender] += _amount;
    }

    function withdraw(uint256 _amount) external {
        depositsOf[msg.sender] -= _amount;
        token.transfer(msg.sender, _amount);
    }

    function flashLoan(address _borrower, uint256 _amount) external returns (bool) {
        uint256 _fee = flashFee(_amount);
        
        token.transfer(_borrower, _amount);

        if (IFlashBorrower(_borrower).onFlashLoan(token, _amount, _fee) != CALLBACK_SUCCESS) {
            revert Pool_CallbackFailed();
        }

        token.transferFrom(_borrower, address(this), _amount + _fee);

        return true;
    }

    function maxFlashLoan() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function flashFee(uint256 _amount) public pure returns (uint256) {
        return 0; // goooood
    }
}
