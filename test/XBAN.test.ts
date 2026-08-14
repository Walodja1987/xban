import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract } from "ethers";

describe("XBAN", function () {
  const DETH_ADDRESS = "0xE46861C9f28c46F27949fb471986d59B256500a7";
  const XNS_ADDRESS = "0x648E4F05aF2b7eB85109A8dc8AE81D8E006457D8";
  const REGISTRATION_FEE = ethers.parseEther("0.0005");
  const BURN_AMOUNT = ethers.parseEther("0.0002");
  const OWNER_FEE = ethers.parseEther("0.0003");
  const XNS_NAME_FEE = ethers.parseEther("0.001");
  const MAX_NUMBER = 9_999_999_999_999_999n;
  // Ownable (slot 0) + Ownable2Step (slot 1) + three mappings (slots 2–4).
  // ReentrancyGuard uses namespaced storage, so nextNumber is at slot 5.
  const NEXT_NUMBER_SLOT = "0x5";

  interface SetupOutput {
    xban: Contract;
    owner: SignerWithAddress;
    user1: SignerWithAddress;
    user2: SignerWithAddress;
    user3: SignerWithAddress;
    deth: Contract;
    xns: Contract;
  }

  async function deployDethAtCanonicalAddress(): Promise<Contract> {
    const dethDeployed = await ethers.deployContract("DETH");
    await dethDeployed.waitForDeployment();
    const dethBytecode = await ethers.provider.getCode(
      await dethDeployed.getAddress(),
    );
    await ethers.provider.send("hardhat_setCode", [
      DETH_ADDRESS,
      dethBytecode,
    ]);
    return ethers.getContractAt("DETH", DETH_ADDRESS);
  }

  async function deployXnsAtCanonicalAddress(): Promise<Contract> {
    const xnsDeployed = await ethers.deployContract("MockXNS");
    await xnsDeployed.waitForDeployment();
    const xnsBytecode = await ethers.provider.getCode(
      await xnsDeployed.getAddress(),
    );
    await ethers.provider.send("hardhat_setCode", [
      XNS_ADDRESS,
      xnsBytecode,
    ]);
    return ethers.getContractAt("MockXNS", XNS_ADDRESS);
  }

  async function setup(): Promise<SetupOutput> {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    const deth = await deployDethAtCanonicalAddress();
    const xns = await deployXnsAtCanonicalAddress();
    const xban = await ethers.deployContract("XBAN", [owner.address], {
      value: XNS_NAME_FEE,
    });
    await xban.waitForDeployment();

    return { xban, owner, user1, user2, user3, deth, xns };
  }

  async function setNextNumber(xban: Contract, value: bigint) {
    await ethers.provider.send("hardhat_setStorageAt", [
      await xban.getAddress(),
      NEXT_NUMBER_SLOT,
      ethers.zeroPadValue(ethers.toBeHex(value), 32),
    ]);
  }

  function expectedChecksum(number: bigint): number {
    const resultingNumber = number * 1_000_000n + 331_400n;
    return Number(98n - (resultingNumber % 97n));
  }

  describe("Contract initialization", function () {
    it("Should initialize the contract correctly", async () => {
      const s = await loadFixture(setup);

      expect(await s.xban.owner()).to.equal(s.owner.address);
      expect(await s.xban.pendingOwner()).to.equal(ethers.ZeroAddress);
      expect(await s.xban.nextNumber()).to.equal(1n);
      expect(await s.xban.registrationOpen()).to.equal(true);
      expect(await s.xns.getName(await s.xban.getAddress())).to.equal(
        "xban-contract.xns",
      );
    });

    it("Should have correct constants", async () => {
      const s = await loadFixture(setup);

      expect(await s.xban.REGISTRATION_FEE()).to.equal(REGISTRATION_FEE);
      expect(await s.xban.BURN_AMOUNT()).to.equal(BURN_AMOUNT);
      expect(await s.xban.OWNER_FEE()).to.equal(OWNER_FEE);
      expect(await s.xban.ACCOUNT_LENGTH()).to.equal(16n);
      expect(await s.xban.XBAN_LENGTH()).to.equal(20n);
      expect(await s.xban.MAX_NUMBER()).to.equal(MAX_NUMBER);
      expect(await s.xban.DETH()).to.equal(DETH_ADDRESS);
    });

    it("Should revert when owner is address(0)", async () => {
      await deployDethAtCanonicalAddress();
      await deployXnsAtCanonicalAddress();
      const XBANFactory = await ethers.getContractFactory("XBAN");

      await expect(
        XBANFactory.deploy(ethers.ZeroAddress, { value: XNS_NAME_FEE }),
      ).to.be.revertedWithCustomError(XBANFactory, "OwnableInvalidOwner");
    });
  });

  describe("register", function () {
    it("Should register the next sequential number for the target", async () => {
      const s = await loadFixture(setup);

      await expect(
        s.xban
          .connect(s.user1)
          .register(s.user1.address, { value: REGISTRATION_FEE }),
      )
        .to.emit(s.xban, "Registered")
        .withArgs(1n, s.user1.address, s.user1.address);

      expect(await s.xban.numberOf(s.user1.address)).to.equal(1n);
      expect(await s.xban.addressOf(1n)).to.equal(s.user1.address);
      expect(await s.xban.isRegistered(s.user1.address)).to.equal(true);
      expect(await s.xban.nextNumber()).to.equal(2n);
    });

    it("Should allow anyone to register any nonzero address", async () => {
      const s = await loadFixture(setup);

      await s.xban
        .connect(s.user1)
        .register(s.user2.address, { value: REGISTRATION_FEE });

      expect(await s.xban.numberOf(s.user2.address)).to.equal(1n);
      expect(await s.xban.addressOf(1n)).to.equal(s.user2.address);
      expect(await s.xban.isRegistered(s.user1.address)).to.equal(false);
    });

    it("Should allocate sequential numbers across registrations", async () => {
      const s = await loadFixture(setup);

      await s.xban
        .connect(s.user1)
        .register(s.user1.address, { value: REGISTRATION_FEE });
      await s.xban
        .connect(s.user2)
        .register(s.user2.address, { value: REGISTRATION_FEE });
      await s.xban
        .connect(s.user3)
        .register(s.user3.address, { value: REGISTRATION_FEE });

      expect(await s.xban.numberOf(s.user1.address)).to.equal(1n);
      expect(await s.xban.numberOf(s.user2.address)).to.equal(2n);
      expect(await s.xban.numberOf(s.user3.address)).to.equal(3n);
      expect(await s.xban.nextNumber()).to.equal(4n);
    });

    it("Should burn via DETH, credit owner fees, and refund excess", async () => {
      const s = await loadFixture(setup);
      const excess = ethers.parseEther("0.001");
      const payment = REGISTRATION_FEE + excess;

      const initialBurned = await s.deth.burned(s.user1.address);
      const initialUserBalance = await ethers.provider.getBalance(
        s.user1.address,
      );

      const tx = await s.xban
        .connect(s.user1)
        .register(s.user1.address, { value: payment });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      expect(await s.deth.burned(s.user1.address)).to.equal(
        initialBurned + BURN_AMOUNT,
      );
      expect(await s.xban.getPendingFees(s.owner.address)).to.equal(OWNER_FEE);

      const finalUserBalance = await ethers.provider.getBalance(
        s.user1.address,
      );
      expect(initialUserBalance - finalUserBalance).to.equal(
        REGISTRATION_FEE + gasUsed,
      );
    });

    it("Should credit DETH to the registrar, not the target", async () => {
      const s = await loadFixture(setup);

      await s.xban
        .connect(s.user1)
        .register(s.user2.address, { value: REGISTRATION_FEE });

      expect(await s.deth.burned(s.user1.address)).to.equal(BURN_AMOUNT);
      expect(await s.deth.burned(s.user2.address)).to.equal(0n);
    });

    it("Should revert for zero target", async () => {
      const s = await loadFixture(setup);

      await expect(
        s.xban
          .connect(s.user1)
          .register(ethers.ZeroAddress, { value: REGISTRATION_FEE }),
      ).to.be.revertedWith("XBAN: zero target");
    });

    it("Should revert for insufficient payment", async () => {
      const s = await loadFixture(setup);

      await expect(
        s.xban
          .connect(s.user1)
          .register(s.user1.address, { value: REGISTRATION_FEE - 1n }),
      ).to.be.revertedWith("XBAN: insufficient payment");
    });

    it("Should revert when address is already registered", async () => {
      const s = await loadFixture(setup);

      await s.xban
        .connect(s.user1)
        .register(s.user1.address, { value: REGISTRATION_FEE });

      await expect(
        s.xban
          .connect(s.user2)
          .register(s.user1.address, { value: REGISTRATION_FEE }),
      ).to.be.revertedWith("XBAN: address already registered");
    });

    it("Should revert when refund fails", async () => {
      const s = await loadFixture(setup);
      const caller = await ethers.deployContract("NoReceiveRegisterCaller");
      await caller.waitForDeployment();

      await expect(
        caller.register(await s.xban.getAddress(), s.user1.address, {
          value: REGISTRATION_FEE + 1n,
        }),
      ).to.be.revertedWith("XBAN: refund failed");
    });

    it("Should assign MAX_NUMBER and then reject further registrations", async () => {
      const s = await loadFixture(setup);

      await setNextNumber(s.xban, MAX_NUMBER);
      expect(await s.xban.registrationOpen()).to.equal(true);

      await s.xban
        .connect(s.user1)
        .register(s.user1.address, { value: REGISTRATION_FEE });

      expect(await s.xban.numberOf(s.user1.address)).to.equal(MAX_NUMBER);
      expect(await s.xban.nextNumber()).to.equal(MAX_NUMBER + 1n);
      expect(await s.xban.registrationOpen()).to.equal(false);

      await expect(
        s.xban
          .connect(s.user2)
          .register(s.user2.address, { value: REGISTRATION_FEE }),
      ).to.be.revertedWith("XBAN: number space exhausted");
    });
  });

  describe("Registry views", function () {
    it("Should return zero / false for unregistered lookups", async () => {
      const s = await loadFixture(setup);

      expect(await s.xban.addressOf(0n)).to.equal(ethers.ZeroAddress);
      expect(await s.xban.addressOf(1n)).to.equal(ethers.ZeroAddress);
      expect(await s.xban.numberOf(s.user1.address)).to.equal(0n);
      expect(await s.xban.isRegistered(s.user1.address)).to.equal(false);
      expect(await s.xban.isRegistered(ethers.ZeroAddress)).to.equal(false);
    });
  });

  describe("Formatting and checksum", function () {
    it("Should match documented checksum examples", async () => {
      const s = await loadFixture(setup);

      expect(await s.xban.checksumOf(1n)).to.equal(23n);
      expect(await s.xban.checksumOf(2n)).to.equal(93n);
      expect(await s.xban.checksumOf(4761935072n)).to.equal(60n);
      expect(await s.xban.checksumOf(1n)).to.equal(expectedChecksum(1n));
      expect(await s.xban.checksumOf(2n)).to.equal(expectedChecksum(2n));
      expect(await s.xban.checksumOf(4761935072n)).to.equal(
        expectedChecksum(4761935072n),
      );
    });

    it("Should format compact XBANs with zero-padded account and checksum", async () => {
      const s = await loadFixture(setup);

      expect(await s.xban.format(1n)).to.equal("XE230000000000000001");
      expect(await s.xban.format(2n)).to.equal("XE930000000000000002");
      // Website example: XE 60 0000 0047 6193 5072
      expect(await s.xban.format(4761935072n)).to.equal(
        "XE600000004761935072",
      );
      expect(await s.xban.accountComponentOf(12345n)).to.equal(
        "0000000000012345",
      );
    });

    it("Should return xbanOf for registered addresses", async () => {
      const s = await loadFixture(setup);

      await s.xban
        .connect(s.user1)
        .register(s.user1.address, { value: REGISTRATION_FEE });

      expect(await s.xban.xbanOf(s.user1.address)).to.equal(
        "XE230000000000000001",
      );
    });

    it("Should revert xbanOf for unregistered addresses", async () => {
      const s = await loadFixture(setup);

      await expect(
        s.xban.xbanOf(s.user1.address),
      ).to.be.revertedWith("XBAN: address not registered");
    });

    it("Should revert format helpers for invalid numbers", async () => {
      const s = await loadFixture(setup);

      await expect(s.xban.format(0n)).to.be.revertedWith(
        "XBAN: invalid number",
      );
      await expect(s.xban.checksumOf(0n)).to.be.revertedWith(
        "XBAN: invalid number",
      );
      await expect(s.xban.accountComponentOf(0n)).to.be.revertedWith(
        "XBAN: invalid number",
      );
      await expect(s.xban.format(MAX_NUMBER + 1n)).to.be.revertedWith(
        "XBAN: invalid number",
      );
    });
  });

  describe("Fees", function () {
    it("Should claim fees to a recipient and to self", async () => {
      const s = await loadFixture(setup);

      await s.xban
        .connect(s.user1)
        .register(s.user1.address, { value: REGISTRATION_FEE });
      expect(await s.xban.getPendingFees(s.owner.address)).to.equal(OWNER_FEE);

      const initialRecipient = await ethers.provider.getBalance(
        s.user2.address,
      );

      await expect(s.xban.connect(s.owner).claimFees(s.user2.address))
        .to.emit(s.xban, "FeesClaimed")
        .withArgs(s.owner.address, s.user2.address, OWNER_FEE);

      expect(await s.xban.getPendingFees(s.owner.address)).to.equal(0n);
      expect(await ethers.provider.getBalance(s.user2.address)).to.equal(
        initialRecipient + OWNER_FEE,
      );

      await s.xban
        .connect(s.user2)
        .register(s.user2.address, { value: REGISTRATION_FEE });

      const ownerBalanceBefore = await ethers.provider.getBalance(
        s.owner.address,
      );
      const claimTx = await s.xban.connect(s.owner).claimFeesToSelf();
      const claimReceipt = await claimTx.wait();
      const claimGas = claimReceipt!.gasUsed * claimReceipt!.gasPrice;

      expect(await ethers.provider.getBalance(s.owner.address)).to.equal(
        ownerBalanceBefore + OWNER_FEE - claimGas,
      );
    });

    it("Should revert claimFees for zero recipient or empty balance", async () => {
      const s = await loadFixture(setup);

      await expect(
        s.xban.connect(s.owner).claimFees(ethers.ZeroAddress),
      ).to.be.revertedWith("XBAN: zero recipient");

      await expect(
        s.xban.connect(s.owner).claimFeesToSelf(),
      ).to.be.revertedWith("XBAN: no fees to claim");
    });

    it("Should revert when fee transfer fails", async () => {
      const s = await loadFixture(setup);
      await s.xban
        .connect(s.user1)
        .register(s.user1.address, { value: REGISTRATION_FEE });

      const revertingReceiver = await ethers.deployContract(
        "RevertingReceiver",
      );
      await revertingReceiver.waitForDeployment();

      await expect(
        s.xban
          .connect(s.owner)
          .claimFees(await revertingReceiver.getAddress()),
      ).to.be.revertedWith("XBAN: fee transfer failed");
    });
  });

  describe("Ownership transfer", function () {
    it("Should transfer ownership via two-step process", async () => {
      const s = await loadFixture(setup);

      await expect(s.xban.connect(s.owner).transferOwnership(s.user1.address))
        .to.emit(s.xban, "OwnershipTransferStarted")
        .withArgs(s.owner.address, s.user1.address);

      expect(await s.xban.pendingOwner()).to.equal(s.user1.address);
      expect(await s.xban.owner()).to.equal(s.owner.address);

      await expect(s.xban.connect(s.user1).acceptOwnership())
        .to.emit(s.xban, "OwnershipTransferred")
        .withArgs(s.owner.address, s.user1.address);

      expect(await s.xban.owner()).to.equal(s.user1.address);
      expect(await s.xban.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("Should keep accrued fees with the old owner and credit new fees to the new owner", async () => {
      const s = await loadFixture(setup);

      await s.xban
        .connect(s.user2)
        .register(s.user2.address, { value: REGISTRATION_FEE });
      expect(await s.xban.getPendingFees(s.owner.address)).to.equal(OWNER_FEE);

      await s.xban.connect(s.owner).transferOwnership(s.user1.address);
      await s.xban.connect(s.user1).acceptOwnership();

      expect(await s.xban.getPendingFees(s.owner.address)).to.equal(OWNER_FEE);
      expect(await s.xban.getPendingFees(s.user1.address)).to.equal(0n);

      await s.xban
        .connect(s.user3)
        .register(s.user3.address, { value: REGISTRATION_FEE });

      expect(await s.xban.getPendingFees(s.owner.address)).to.equal(OWNER_FEE);
      expect(await s.xban.getPendingFees(s.user1.address)).to.equal(OWNER_FEE);

      await expect(s.xban.connect(s.owner).claimFeesToSelf())
        .to.emit(s.xban, "FeesClaimed")
        .withArgs(s.owner.address, s.owner.address, OWNER_FEE);
    });

    it("Should revert when non-owner transfers or non-pending owner accepts", async () => {
      const s = await loadFixture(setup);

      await expect(
        s.xban.connect(s.user1).transferOwnership(s.user2.address),
      ).to.be.revertedWithCustomError(s.xban, "OwnableUnauthorizedAccount");

      await s.xban.connect(s.owner).transferOwnership(s.user1.address);

      await expect(
        s.xban.connect(s.user2).acceptOwnership(),
      ).to.be.revertedWithCustomError(s.xban, "OwnableUnauthorizedAccount");
    });

    it("Should revert when renouncing ownership", async () => {
      const s = await loadFixture(setup);

      await expect(
        s.xban.connect(s.owner).renounceOwnership(),
      ).to.be.revertedWith("XBAN: renounce disabled");
    });
  });

  describe("Contract self-registration", function () {
    it("Should register via SelfRegisteringContract constructor", async () => {
      const s = await loadFixture(setup);

      const selfRegistering = await ethers.deployContract(
        "SelfRegisteringContract",
        [await s.xban.getAddress(), true],
        { value: REGISTRATION_FEE },
      );
      await selfRegistering.waitForDeployment();

      const addr = await selfRegistering.getAddress();
      expect(await s.xban.isRegistered(addr)).to.equal(true);
      expect(await s.xban.numberOf(addr)).to.equal(1n);
    });

    it("Should register MockERC20A in constructor and MockERC20B via register()", async () => {
      const s = await loadFixture(setup);

      const tokenA = await ethers.deployContract(
        "MockERC20A",
        [
          "Token A",
          "TKA",
          await s.xban.getAddress(),
          ethers.parseEther("1000"),
          true,
        ],
        { value: REGISTRATION_FEE },
      );
      await tokenA.waitForDeployment();

      expect(await s.xban.isRegistered(await tokenA.getAddress())).to.equal(
        true,
      );

      const tokenB = await ethers.deployContract("MockERC20B", [
        "Token B",
        "TKB",
        await s.xban.getAddress(),
        ethers.parseEther("1000"),
      ]);
      await tokenB.waitForDeployment();

      await tokenB.register({ value: REGISTRATION_FEE });
      expect(await s.xban.isRegistered(await tokenB.getAddress())).to.equal(
        true,
      );
      expect(await s.xban.numberOf(await tokenB.getAddress())).to.equal(2n);
    });
  });
});
