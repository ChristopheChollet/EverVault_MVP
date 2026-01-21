import { expect } from "chai";
import { network } from "hardhat";

describe("GreenVaultSimple (MVP)", function () {
  async function deploy() {
    const { ethers } = await network.connect();
    const [owner, user] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const GreenVaultSimple = await ethers.getContractFactory("GreenVaultSimple");
    const vault = await GreenVaultSimple.deploy(await usdc.getAddress());
    await vault.waitForDeployment();

    return { ethers, owner, user, usdc, vault };
  }

  it("deploys with correct feeRecipient", async () => {
    const { owner, vault } = await deploy();
    expect(await vault.feeRecipient()).to.equal(owner.address);
  });

  it("reverts on zero deposit", async () => {
    const { user, vault } = await deploy();
    await expect(vault.connect(user).deposit(0)).to.be.revertedWithCustomError(vault, "ZeroAmount");
  });

  it("deposit mints 1:1 shares and updates TVL", async () => {
    const { user, usdc, vault } = await deploy();
    const amount = 10_000_000n; // 10 USDC (6 decimals)

    await usdc.mint(user.address, amount);
    await usdc.connect(user).approve(await vault.getAddress(), amount);

    await expect(vault.connect(user).deposit(amount))
      .to.emit(vault, "Deposited")
      .withArgs(user.address, amount, amount);

    expect(await vault.totalValueLocked()).to.equal(amount);
    expect(await vault.balanceOf(user.address)).to.equal(amount);
  });

  it("withdraw burns shares, applies fee, and updates TVL", async () => {
    const { owner, user, usdc, vault } = await deploy();
    const amount = 10_000_000n; // 10 USDC

    await usdc.mint(user.address, amount);
    await usdc.connect(user).approve(await vault.getAddress(), amount);
    await vault.connect(user).deposit(amount);

    // Fee = 0.5% => 50 bps => 0.05 USDC for 10 USDC
    const expectedFee = (amount * 50n) / 10_000n;
    const expectedNet = amount - expectedFee;

    await expect(vault.connect(user).withdraw(amount))
      .to.emit(vault, "Withdrawn")
      .withArgs(user.address, amount, expectedNet);

    expect(await vault.totalValueLocked()).to.equal(0n);
    expect(await vault.balanceOf(user.address)).to.equal(0n);

    expect(await usdc.balanceOf(user.address)).to.equal(expectedNet);
    expect(await usdc.balanceOf(owner.address)).to.equal(expectedFee);
  });

  it("pause blocks deposit/withdraw", async () => {
    const { owner, user, usdc, vault } = await deploy();
    const amount = 1_000_000n; // 1 USDC

    await usdc.mint(user.address, amount);
    await usdc.connect(user).approve(await vault.getAddress(), amount);

    await vault.connect(owner).pause();

    await expect(vault.connect(user).deposit(amount)).to.be.revertedWithCustomError(vault, "EnforcedPause");
    await expect(vault.connect(user).withdraw(amount)).to.be.revertedWithCustomError(vault, "EnforcedPause");
  });

  it("setFeeRecipient emits event and updates state", async () => {
    const { owner, vault } = await deploy();
    const newRecipient = "0x000000000000000000000000000000000000dEaD";

    await expect(vault.connect(owner).setFeeRecipient(newRecipient))
      .to.emit(vault, "FeeRecipientUpdated")
      .withArgs(owner.address, newRecipient);

    expect(await vault.feeRecipient()).to.equal(newRecipient);
  });
});


