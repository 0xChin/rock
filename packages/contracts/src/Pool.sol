// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {L2NativeSuperchainERC20} from './L2NativeSuperchainERC20.sol';
import {SuperchainTokenBridge} from "@optimism/contracts-bedrock/L2/SuperchainTokenBridge.sol";
import {L2ToL2CrossDomainMessenger} from "@optimism/contracts-bedrock/L2/L2ToL2CrossDomainMessenger.sol";

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
    SuperchainTokenBridge public constant SUPERCHAIN_TOKEN_BRIDGE =
        SuperchainTokenBridge(0x4200000000000000000000000000000000000028);
    L2ToL2CrossDomainMessenger public constant CROSS_DOMAIN_MESSENGER =
        L2ToL2CrossDomainMessenger(0x4200000000000000000000000000000000000023);
    bytes32 public constant CALLBACK_SUCCESS = keccak256('ERC3156FlashBorrower.onFlashLoan');

    error Pool_CallbackFailed();

    L2NativeSuperchainERC20 public immutable token;

    constructor(L2NativeSuperchainERC20 _token) {
        token = _token;
    }

    function deposit(uint256 _amount) external {
        token.transferFrom(msg.sender, address(this), _amount);
    }

    function flashLoan(
        address _borrower,
        uint256 _amount,
        uint256 _loanChainId
    ) external returns (bytes32 _messageId) {
        uint256 _fee = flashFee(_amount);
        uint256 _maxFlashLoan = maxFlashLoan();

        if (_maxFlashLoan < _amount) {
            bytes memory message = abi.encode(_borrower, _amount, block.chainid);
            _messageId = CROSS_DOMAIN_MESSENGER.sendMessage(
                _loanChainId,
                address(this),
                abi.encodeWithSignature(
                    "requestTokens(uint256,bytes)",
                    _amount - _maxFlashLoan,
                    message
                )
            );
        } else {
            token.transfer(_borrower, _amount);

            if (IFlashBorrower(_borrower).onFlashLoan(token, _amount, _fee) != CALLBACK_SUCCESS) {
                revert Pool_CallbackFailed();
            }

            token.transferFrom(_borrower, address(this), _amount + _fee);
        }
    }

    function requestTokens(
        uint256 _amountToSend,
        bytes memory _message
    ) external returns (bytes32 _messageId) {
        (address _borrower, uint256 _amount, uint256 _chainId) = abi.decode(
            _message,
            (address, uint256, uint256)
        );

        SUPERCHAIN_TOKEN_BRIDGE.sendERC20(address(token), address(this), _amountToSend, _chainId);
        _messageId = CROSS_DOMAIN_MESSENGER.sendMessage(
            _chainId,
            address(this),
            abi.encodeWithSignature(
                "flashLoan(address,uint256,uint256)",
                _borrower,
                _amountToSend,
                _chainId
            )
        );
    }

    function maxFlashLoan() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function flashFee(uint256 _amount) public pure returns (uint256) {
        return 0; // goooood
    }
}
