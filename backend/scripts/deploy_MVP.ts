// scripts/deploy-simple.ts
import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  console.log("Déploiement avec le compte:", deployer.address);

  // Adresse Circle USDC sur Sepolia (en minuscules)
  const USDC_ADDRESS = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
  console.log("USDC Address:", USDC_ADDRESS);

  const GreenVaultSimple = await ethers.getContractFactory("GreenVaultSimple");
  const vault = await GreenVaultSimple.deploy(USDC_ADDRESS);
  await vault.waitForDeployment();
  
  const contractAddress = await vault.getAddress();
  console.log("");
  console.log("✅ GreenVaultSimple déployé à:", contractAddress);
  console.log("");
  console.log("Mettez à jour votre .env avec:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

