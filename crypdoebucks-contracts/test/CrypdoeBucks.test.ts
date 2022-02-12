import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getEventData, getRevertMessage } from "./utils";

let CrypdoeBucks: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user1: tsEthers.Signer;
let user2: tsEthers.Signer;

type buck = {
  points: number;
  readyTime: number;
  fightingStyle: number;
  does: number;
};

const buck1: buck = {
  points: 14,
  readyTime: 0,
  fightingStyle: 1,
  does: 69,
};

const buck2: buck = {
  points: 2,
  readyTime: 0,
  fightingStyle: 3,
  does: 1,
};

let deployerAddress: string;
let user1Address: string;
let user2Address: string;

describe("CrypdoeBucks", () => {
  before(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

    user1Address = await user1.getAddress();

    user2Address = await user2.getAddress();

    // console.log(user1Address, user2Address, deployerAddress)

    CrypdoeBucks = await (
      await ethers.getContractFactory("CrypdoeBucks")
    ).deploy("https://token-cdn-domain/{id}.json");
  });

  it("Should mint a buck to user", async () => {
    const receipt = await (
      await CrypdoeBucks.createBuck(
        user1Address,
        buck1.points,
        buck1.fightingStyle,
        buck1.does
      )
    ).wait(1);
    const owner = await CrypdoeBucks.buckToOwner(0);
    const buckBalance = await CrypdoeBucks.balanceOf(user1Address, 0);
    const { points, fightingStyle, does } = await CrypdoeBucks.bucks(0);

    const uri: string = await CrypdoeBucks.uri(1);
    console.log(uri);
    const event = getEventData("NewBuck", CrypdoeBucks, receipt);
    expect(event.id).to.equal(0);
    expect(event.to).to.equal(user1Address);
    expect(event.points).to.equal(buck1.points);
    expect(event.does).to.equal(buck1.does);

    expect(points).to.equal(buck1.points);
    expect(fightingStyle).to.equal(buck1.fightingStyle);
    expect(does).to.equal(buck1.does);
    expect(owner).to.equal(user1Address);
    expect(buckBalance).to.equal(1);
  });

  it("Should be able to attack another buck, win and get the defenders does: winner", async () => {
    const user1Address = await user1.getAddress();
    await CrypdoeBucks.createBuck(
      user1Address,
      buck1.points,
      buck1.fightingStyle,
      buck1.does
    );

    const user2Address = await user2.getAddress();
    let receipt = await (
      await CrypdoeBucks.createBuck(
        user2Address,
        buck2.points,
        buck2.fightingStyle,
        buck2.does
      )
    ).wait(1);

    let event = getEventData("NewBuck", CrypdoeBucks, receipt);
    expect(event.id).to.equal(2);
    expect(event.to).to.equal(user2Address);
    expect(event.points).to.equal(buck2.points);
    expect(event.does).to.equal(buck2.does);

    const { readyTime } = await CrypdoeBucks.bucks(1);

    receipt = await (await CrypdoeBucks.connect(user1).fight(1, 2)).wait(1);
    event = getEventData("Fight", CrypdoeBucks, receipt);

    if (event.doesMoved == 4200000000) {
      // draw
      console.log("Draw!");
    } else if (event.doesMoved > 0) {
      console.log("Winner!");
      expect(event.doesMoved).to.equal(buck2.does);
      // Check ready time is reset
      expect(readyTime).to.greaterThan(Date.now() / 1000);
      const { does } = await CrypdoeBucks.bucks(2);
      expect(does).to.equal(0);
    } else {
      expect(event.doesMoved).to.equal(0);
      const { does } = await CrypdoeBucks.bucks(2);
      expect(does).to.equal(1);
      console.log("Loser!");
    }
  });

  it("Should be able to attack another buck, win and get the defenders does: looser", async () => {
    const user1Address = await user1.getAddress();
    await CrypdoeBucks.createBuck(
      user1Address,
      buck1.points,
      buck1.fightingStyle,
      buck1.does
    );

    const user2Address = await user2.getAddress();
    let receipt = await (
      await CrypdoeBucks.createBuck(
        user2Address,
        buck2.points,
        buck2.fightingStyle,
        buck2.does
      )
    ).wait(1);

    let event = getEventData("NewBuck", CrypdoeBucks, receipt);
    expect(event.id).to.equal(4);
    expect(event.to).to.equal(user2Address);
    expect(event.points).to.equal(buck2.points);
    expect(event.does).to.equal(buck2.does);

    const { readyTime } = await CrypdoeBucks.bucks(1);

    receipt = await (await CrypdoeBucks.connect(user2).fight(4, 3)).wait(1);
    event = getEventData("Fight", CrypdoeBucks, receipt);

    if (event.doesMoved === 4200000000) {
      // draw
      console.log("Draw!");
    } else if (event.doesMoved > 0) {
      console.log("Winner!");
      expect(event.doesMoved).to.equal(buck2.does);
      // Check ready time is reset
      expect(readyTime).to.greaterThan(Date.now() / 1000);
      const { does } = await CrypdoeBucks.bucks(4);
      expect(does).to.equal(0);
    } else {
      expect(event.doesMoved).to.equal(0);
      const { does } = await CrypdoeBucks.bucks(4);
      expect(does).to.equal(1);
      console.log("Loser!");
    }
  });

  // TODO: Add negative tests, for acsess control
});
