// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BondingCurvePool} from "../contracts/BondingCurvePool.sol";
import {LaunchPadToken} from "../contracts/LaunchPadToken.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function warp(uint256 newTimestamp) external;
}

contract BondingCurvePoolTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    LaunchPadToken private token;
    BondingCurvePool private pool;

    function setUp() public {
        token = new LaunchPadToken("Arc Token", "ARC", address(this));
        pool = new BondingCurvePool(address(token));
        token.setMinter(address(pool));
        vm.deal(address(this), 10 ether);
        vm.warp(100);
    }

    receive() external payable {}

    function testBuyEnforcesSlippageAndDeadline() public {
        uint256 value = 1 ether;
        uint256 quote = pool.getPriceForBuy(value);
        (bool slippageOk,) = address(pool).call{value: value}(
            abi.encodeCall(pool.buy, (address(this), quote + 1, type(uint256).max))
        );
        require(!slippageOk, "slippage call should revert");
        (bool deadlineOk,) = address(pool).call{value: value}(
            abi.encodeCall(pool.buy, (address(this), 0, 1))
        );
        require(!deadlineOk, "expired call should revert");
        pool.buy{value: value}(address(this), quote, type(uint256).max);
        require(token.balanceOf(address(this)) == quote, "incorrect buy output");
    }

    function testSellRequiresApprovalAndEnforcesMinimum() public {
        pool.buy{value: 2 ether}(address(this), 0, type(uint256).max);
        uint256 amount = token.balanceOf(address(this)) / 2;
        uint256 quote = pool.getPriceForSell(amount);
        token.approve(address(pool), amount);
        (bool slippageOk,) = address(pool).call(
            abi.encodeCall(pool.sell, (address(this), amount, quote + 1, type(uint256).max))
        );
        require(!slippageOk, "slippage call should revert");
        pool.sell(address(this), amount, quote, type(uint256).max);
        require(token.balanceOf(address(this)) == amount, "incorrect remaining balance");
    }
}
