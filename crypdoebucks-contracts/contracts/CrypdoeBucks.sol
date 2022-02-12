// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

// do we want to make it IERC1155MetadataURI?
contract CrypdoeBucks is ERC1155, Ownable {
    mapping(uint256 => string) idToIpfs;
    // Token supply per token id
    mapping(uint256 => uint256) public tokenSupply;
    // Token id to owner
    mapping (uint => address) public buckToOwner;
    // Mapping for fight styles
    mapping(uint32 => uint32) winMap;

    string public name;
    string public symbol;
    address private immutable self;
    // Time until buck can fight again
    uint32 cooldownTime;

    struct Buck {
        // If points is odd assume it is like a 4/5
        uint32 points;
        // Time until buck can fight again
        uint32 readyTime;
        // 1, 2 or 3 Rock paper sissors style
        uint32 fightingStyle;
        // Number of does under bucks control
        uint32 does;
    }

    Buck[] public bucks;

    // TODO: How are the does dispured to begin with?
    // randomly to bucks?

    event Fight(uint defender, uint attacker, uint32 doesMoved);

    event NewBuck(address to, uint id, uint32 points, uint32 fightingStyle, uint32 does);
    
    modifier ownerOf(uint _id) {
      require(msg.sender == buckToOwner[_id], "Must be the buck owner");
        _;
    }

    constructor(string memory uri) ERC1155(uri) {
    self = address(this);
    name = "Crypto Bucks";
    symbol = "BUCK";
    winMap[1] = 3;
    winMap[2] = 1;
    winMap[3] = 2;
    // Set this at 5 mins while we test 
    cooldownTime = 300;
    }

    // Could turn this into an internal function if we want to do the random genereration onchain, public is expensive
    // Might make the sale contract call this and supply random attributes
    function createBuck(address owner, uint32 _points, uint32 _fightingStyle, uint32 _does) public onlyOwner returns (uint) {
        bucks.push(Buck(_points, uint32(block.timestamp + cooldownTime), _fightingStyle, _does));
        uint id = bucks.length - 1;
        _mint(owner, id, 1, "");
        buckToOwner[id] = owner;
        emit NewBuck(owner, id, _points, _fightingStyle, _does);
        return id;
    }

    // Cooldown after fight
    function _triggerCooldown(uint id) internal {
      bucks[id].readyTime = uint32(block.timestamp + cooldownTime);
    }

  // Pseudo randomness generator
  // Use Chainlink VRF instead if big dog money is being used.
    function random(uint pseudo) private view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, pseudo)));
    }

    // Add RND to power level
    function powerLevel(uint id, uint32 points) private view returns (uint) {
        // Tune randomness from here
        return random(id) % points ** 4;
    }

    // Returns if the attacker has style advantage
    // Ensure tie check is done beforehand
    function fightingStyleCalc (uint32 attackStyle, uint32 defendStyle) private view returns (bool) {
        return winMap[attackStyle] == defendStyle;
    }

    function moveDoes(uint fromId, uint toId) internal {
      Buck storage fromBuck = bucks[fromId];
      Buck storage toBuck = bucks[toId];
      uint32 doesMoving = fromBuck.does;
      fromBuck.does = 0;
      toBuck.does = toBuck.does + doesMoving;
    }

    // Fight function
    // Add modifier to make sure only buck owner makes call
    function fight(uint256 attackerId, uint256 defenderId) external ownerOf(attackerId) {
      Buck memory attackingBuck = bucks[attackerId];
      Buck memory defendingBuck = bucks[defenderId];
      require(defendingBuck.does >= 1, "Defender has no does.");

      uint attackPower;
      uint defendPower;

      uint32 attackingBuckPoints = attackingBuck.points;
      uint32 defendingBuckPoints = defendingBuck.points;

      // Who has the winning style?
      // Buck with the winning style gets plus 2 power, maybe make that a constant?
      if (attackingBuck.fightingStyle != defendingBuck.fightingStyle) {
        bool attackerAdvantage = fightingStyleCalc(attackingBuck.fightingStyle, defendingBuck.fightingStyle);
        if (attackerAdvantage) {
          attackingBuckPoints = attackingBuckPoints + 2;
        } else {
          defendingBuckPoints = defendingBuckPoints + 2;
        }
      }

      attackPower = powerLevel(attackerId, attackingBuckPoints);
      defendPower = powerLevel(defenderId, defendingBuckPoints);

      // Who has more power?
      if (attackPower > defendPower) {
        // Attacker wins, transfer defenders does
        _triggerCooldown(attackerId);
        moveDoes(defenderId, attackerId);
        emit Fight(defenderId, attackerId, defendingBuck.does);
      } else if (attackPower == defendPower) {
        // No one wins, defender keeps does, attacker has no death risk and no cooldown
        // Hacky solution for a draw
        emit Fight(defenderId, attackerId, 4200000000);
      } else if (attackPower < defendPower) {
        // Attacker loses, defender keeps does, attacker gets cooldown and death risk
        _triggerCooldown(attackerId);
        emit Fight(defenderId, attackerId, 0);
      }
      // emit an event and return a value?
    }
}