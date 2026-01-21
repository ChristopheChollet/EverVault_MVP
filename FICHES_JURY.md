# 🎯 FICHE MÉMO - EverVault MVP

## 📝 PITCH (30 secondes)

> "EverVault est un **vault DeFi** qui permet aux utilisateurs de déposer des USDC et de recevoir des parts (evUSDC) en retour. C'est un MVP qui pose les bases d'un futur vault multi-actifs avec génération de rendement."

---

## 📋 CAHIER DES CHARGES (Résumé)

| Besoin | Solution |
|--------|----------|
| Stocker des stablecoins de façon sécurisée | Vault avec smart contract auditable |
| Suivre la part de chaque utilisateur | Token ERC20 (evUSDC) représentant les parts |
| Modèle économique simple | Frais de retrait de 0.5% |
| Interface utilisateur intuitive | Frontend Next.js avec connexion wallet |
| Testabilité sur environnement réel | Déploiement sur Sepolia testnet |

**Objectif principal :** Créer un coffre-fort décentralisé permettant aux utilisateurs de déposer des USDC et de récupérer leur investissement à tout moment, avec une traçabilité totale on-chain.

---

## 🏗️ ARCHITECTURE EN 1 IMAGE

```
┌─────────────┐     approve      ┌──────────────┐
│   Wallet    │ ──────────────►  │    USDC      │
│  MetaMask   │                  │   (Circle)   │
└─────────────┘                  └──────────────┘
       │                                │
       │ deposit()                      │ transferFrom()
       ▼                                ▼
┌─────────────────────────────────────────────────┐
│              EverVault Contract                 │
│  ┌─────────────────────────────────────────┐   │
│  │  deposit() → mint evUSDC + update TVL   │   │
│  │  withdraw() → burn evUSDC - 0.5% fee    │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 🔑 LES 3 CONCEPTS CLÉS

| Concept | Explication simple |
|---------|-------------------|
| **TVL** | Total Value Locked = tous les USDC dans le coffre |
| **Parts (evUSDC)** | Token reçu quand tu déposes, représente ta part du vault |
| **Approve/Deposit** | 2 étapes : autoriser puis transférer (standard ERC20) |

---

## 🪙 JUSTIFICATION DU TOKEN (ERC20 Fongible)

### Pourquoi un token ERC20 fongible (evUSDC) ?

| Critère | ERC20 (Fongible) ✅ | ERC721 (NFT) ❌ |
|---------|---------------------|-----------------|
| **Divisibilité** | Oui, on peut déposer 10.5 USDC | Non, NFT = unités entières |
| **Interchangeabilité** | 1 evUSDC = 1 evUSDC (même valeur) | Chaque NFT est unique |
| **Liquidité** | Facilement échangeable sur DEX | Moins liquide |
| **Cas d'usage DeFi** | Standard pour les vaults (Aave, Compound) | Utilisé pour art/collectibles |

### À dire au jury :
> *"J'ai choisi un token ERC20 fongible car dans un vault DeFi, toutes les parts ont la même valeur. 1 evUSDC représente toujours la même fraction du vault, peu importe qui le détient. C'est le standard utilisé par tous les protocoles DeFi majeurs comme Aave (aTokens) ou Yearn (yTokens)."*

### Le token evUSDC :
- **Nom :** EverVault Shares
- **Symbole :** evUSDC
- **Ratio :** 1:1 avec USDC (1 evUSDC = 1 USDC déposé)
- **Mintage :** À chaque dépôt, l'utilisateur reçoit des evUSDC
- **Burn :** Au retrait, les evUSDC sont brûlés

---

## 📄 LE SMART CONTRACT - Ce qu'il faut savoir

### Imports OpenZeppelin (ligne 4-8)
```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";      // Standard token
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";  // Sécurité
import "@openzeppelin/contracts/access/Ownable.sol";         // Admin
```
**À dire :** *"J'utilise des librairies OpenZeppelin auditées pour la sécurité."*

### Les 2 fonctions principales

**deposit() :**
```
1. Vérifie que montant > 0
2. Transfère USDC du user vers le contrat
3. Met à jour le TVL
4. Mint des parts evUSDC (ratio 1:1)
```

**withdraw() :**
```
1. Vérifie que user a assez de parts
2. Calcule les frais (0.5%)
3. Brûle les parts
4. Met à jour le TVL
5. Envoie les USDC (moins les frais)
```

---

## 🛡️ SÉCURITÉ - Attaques connues et protections

### 1. Reentrancy Attack (Attaque de réentrance)

**L'attaque :** Un contrat malveillant rappelle `withdraw()` avant que la première exécution soit terminée, vidant le vault.

**Exemple célèbre :** The DAO Hack (2016) - 60M$ volés

**Ma protection :**
```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EverVaultSimple is ERC20, ReentrancyGuard {
    function withdraw(uint256 shares) external nonReentrant { // ← Bloque la réentrance
        // ...
    }
}
```

### 2. Integer Overflow/Underflow

**L'attaque :** Manipulation des calculs pour obtenir plus de tokens que prévu.

**Ma protection :**
> *"Solidity 0.8+ intègre nativement les checks overflow/underflow. Toute opération qui dépasse les limites revert automatiquement."*

### 3. Front-Running

**L'attaque :** Un bot voit ta transaction en mempool et exécute la sienne avant.

**Ma protection :**
> *"Dans ce MVP avec ratio 1:1, le front-running n'a pas d'impact. En V2 avec yield variable, j'utiliserais un système de commit-reveal ou des slippage limits."*

### 4. Approve Race Condition

**L'attaque :** Entre deux `approve()`, un attaquant peut utiliser l'ancienne allowance + la nouvelle.

**Ma protection :**
```solidity
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;
// Utilise safeTransferFrom au lieu de transferFrom
```

### 5. Access Control

**L'attaque :** N'importe qui modifie les paramètres du contrat.

**Ma protection :**
```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

function setFeeRecipient(address _recipient) external onlyOwner { // ← Seul l'owner
    // ...
}
```

### Tableau récapitulatif :

| Attaque | Risque | Protection |
|---------|--------|------------|
| Reentrancy | 🔴 Critique | `nonReentrant` modifier |
| Overflow | 🟡 Moyen | Solidity 0.8+ natif |
| Front-running | 🟢 Faible (MVP) | Ratio 1:1 fixe |
| Approve race | 🟡 Moyen | SafeERC20 |
| Access Control | 🔴 Critique | Ownable + onlyOwner |

---

## 🔄 GESTION DU VERSIONING (Git)

### Structure des commits :
```bash
git log --oneline
65b8596 Fix TVL auto-refresh + add refresh button
2cbc45c Fix footer - fixed at bottom of viewport
79fc2e3 Downgrade to Next.js 14 for Vercel compatibility
21da4e5 Add comprehensive README
3a60d99 Initial commit - EverVault MVP
```

### Bonnes pratiques appliquées :
- **Commits atomiques** : Un commit = une fonctionnalité/fix
- **Messages descriptifs** : Verbe + description (Fix, Add, Update)
- **Branche principale** : `main` pour le code stable

### À dire au jury :
> *"J'utilise Git pour versionner mon code. Chaque commit est atomique avec un message clair. En équipe, j'utiliserais des branches feature et des pull requests pour la code review."*

### Commandes utiles à connaître :
```bash
git status          # Voir l'état actuel
git log --oneline   # Historique condensé
git diff            # Voir les modifications
git checkout <hash> # Revenir à une version
```

---

## 🧪 TESTS UNITAIRES

### Fichier de test : `backend/test/EverVault.test.ts`

```typescript
describe("EverVault", function () {
  it("Should deploy successfully", async function () {
    // Vérifie que le contrat se déploie correctement
  });

  it("Should revert if deposit amount is zero", async function () {
    // Vérifie qu'on ne peut pas déposer 0
    await expect(everVault.connect(user1).deposit(0))
      .to.be.revertedWithCustomError(everVault, "ZeroAmount");
  });

  it("Should have correct fee recipient", async function () {
    // Vérifie que le destinataire des frais est l'owner
  });
});
```

### Commande pour lancer les tests EN LIVE :
```bash
cd backend
npx hardhat test
```

### À dire pendant la démo :
> *"Je lance les tests unitaires avec Hardhat. Chaque test vérifie un comportement spécifique : déploiement, validation des entrées, et configuration initiale."*

### Types de tests couverts :
| Test | Ce qu'il vérifie |
|------|-----------------|
| Déploiement | Le contrat se déploie sans erreur |
| Validation input | `deposit(0)` revert avec `ZeroAmount` |
| Configuration | `feeRecipient` = deployer au départ |

---

## 🖥️ CODE FRONTEND ↔ SMART CONTRACT

### Architecture Front-End :

```
frontend/
├── app/
│   └── page.tsx          # Page principale
├── components/
│   ├── DepositForm.tsx   # Formulaire de dépôt
│   ├── WithdrawForm.tsx  # Formulaire de retrait
│   ├── TVLDisplay.tsx    # Affichage du TVL
│   └── Header.tsx        # Connexion wallet
└── constants/
    └── index.ts          # ABI + adresse du contrat
```

### Comment le front interagit avec le contrat :

**1. Connexion au contrat (wagmi + viem) :**
```typescript
// constants/index.ts
export const contractAddress = "0x58E3cf7e9FD485CD5f36c5e330a4eCb178bA1B03";
export const contractAbi = [...]; // ABI généré par Hardhat
```

**2. Lecture du TVL (useReadContract) :**
```typescript
// TVLDisplay.tsx
const { data: tvl } = useReadContract({
  address: contractAddress,
  abi: contractAbi,
  functionName: "totalValueLocked",
});
```

**3. Écriture - Dépôt (useWriteContract) :**
```typescript
// DepositForm.tsx
const { writeContract } = useWriteContract();

// Étape 1: Approve USDC
writeContract({
  address: USDC_ADDRESS,
  abi: erc20Abi,
  functionName: "approve",
  args: [contractAddress, amountInWei],
});

// Étape 2: Deposit
writeContract({
  address: contractAddress,
  abi: contractAbi,
  functionName: "deposit",
  args: [amountInWei],
});
```

**4. Attente de confirmation :**
```typescript
const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });
```

### Hooks wagmi utilisés :

| Hook | Usage |
|------|-------|
| `useAccount` | Récupère l'adresse du wallet connecté |
| `useReadContract` | Lit des données du contrat (view functions) |
| `useWriteContract` | Envoie des transactions (state-changing) |
| `useWaitForTransactionReceipt` | Attend la confirmation de la tx |

### À dire au jury :
> *"J'utilise wagmi et viem pour interagir avec le smart contract. wagmi fournit des hooks React qui simplifient la lecture et l'écriture on-chain. Le flux est : connexion wallet → lecture état → transaction → attente confirmation → mise à jour UI."*

---

## 🚀 DÉPLOIEMENT SUR BLOCKCHAIN

### Commande de déploiement :
```bash
cd backend
npx hardhat run scripts/deploy_MVP.ts --network sepolia
```

### Script de déploiement (`deploy_MVP.ts`) :
```typescript
const USDC_ADDRESS = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
const EverVaultSimple = await ethers.getContractFactory("EverVaultSimple");
const vault = await EverVaultSimple.deploy(USDC_ADDRESS);
console.log("✅ EverVaultSimple déployé à:", await vault.getAddress());
```

### Vérification sur Etherscan :
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <USDC_ADDRESS>
```

---

## 📍 ADRESSES À CONNAÎTRE

| Quoi | Adresse |
|------|---------|
| Contrat EverVault | `0x58E3cf7e9FD485CD5f36c5e330a4eCb178bA1B03` |
| USDC Sepolia | `0x1c7D4B196Cb0C7b01d743Fbc6116a902379C7238` |

---

## ❓ QUESTIONS PROBABLES + RÉPONSES

### Q1 : "Pourquoi approve avant deposit ?"
> *"C'est le standard ERC20. L'utilisateur autorise d'abord le contrat à prélever ses tokens, puis le contrat fait le transfert. Ça sépare l'autorisation de l'exécution pour plus de sécurité."*

### Q2 : "C'est quoi ReentrancyGuard ?"
> *"C'est une protection contre les attaques de réentrance. Ça empêche un attaquant de rappeler la fonction withdraw() avant qu'elle soit terminée - comme le hack de The DAO en 2016."*

### Q3 : "Pourquoi des frais de 0.5% ?"
> *"C'est un modèle économique simple pour le MVP. En V2, ces frais pourraient financer une DAO ou être redistribués aux holders."*

### Q4 : "Pourquoi USDC et pas ETH ?"
> *"USDC est un stablecoin, sa valeur est stable. Ça simplifie les calculs et c'est plus adapté pour un vault DeFi où on veut éviter la volatilité."*

### Q5 : "C'est quoi la différence avec ton contrat de base EverVault.sol ?"
> *"EverVault.sol était prévu pour intégrer Aave et générer du yield. Le MVP est simplifié car Aave sur Sepolia utilise des tokens de test différents. En V2 sur mainnet, j'intégrerais Aave."*

### Q6 : "Comment tu génères du rendement ?"
> *"Dans ce MVP, il n'y a pas de yield. En V2, les USDC seraient déposés sur Aave ou Compound pour générer des intérêts automatiquement."*

### Q7 : "Pourquoi Sepolia et pas mainnet ?"
> *"Sepolia est un testnet gratuit. Ça permet de tester sans risquer de vrais fonds. Le code est identique, seule l'adresse du réseau change."*

### Q8 : "Comment tu gères les erreurs côté front ?"
> *"J'utilise les custom errors de Solidity (ZeroAmount, InsufficientShares) qui sont catchées côté front avec des toasts pour informer l'utilisateur."*

---

## 🛠️ STACK TECHNIQUE

| Composant | Technologie | Pourquoi |
|-----------|-------------|----------|
| Smart Contract | Solidity 0.8.28 + Hardhat 3 | Standard industrie |
| Librairies | OpenZeppelin 5.4 | Audité, sécurisé |
| Frontend | Next.js 14 + React | SSR + performance |
| Web3 | Wagmi v2 + Viem | Abstraction wallet simplifiée |
| Wallet | RainbowKit | UX moderne |
| Blockchain | Sepolia testnet | Test gratuit avant mainnet |
| Token | USDC (Circle) | Stablecoin de référence |
| Tests | Mocha + Chai | Framework standard Hardhat |

---

## 🚀 ÉVOLUTIONS V2 (si on te demande)

1. **Intégration Aave** → Yield automatique sur les dépôts
2. **Multi-assets** → Accepter ETH, WBTC, DAI...
3. **Governance DAO** → Token de gouvernance pour voter
4. **Stratégies de yield** → Optimiser les rendements automatiquement
5. **Audit sécurité** → Certik, Trail of Bits...

---

## ✅ CHECKLIST DÉMO

1. [ ] Connecter MetaMask (Sepolia)
2. [ ] Montrer le TVL initial
3. [ ] Entrer un montant (ex: 10 USDC)
4. [ ] Cliquer "Approuver" → Confirmer dans MetaMask
5. [ ] Cliquer "Déposer" → Confirmer dans MetaMask
6. [ ] Montrer le TVL mis à jour
7. [ ] Montrer la tx sur Etherscan
8. [ ] Optionnel : faire un retrait
9. [ ] **Lancer les tests :** `cd backend && npx hardhat test`
10. [ ] **Montrer le code front** qui interagit avec le contrat

---

## 💡 PHRASES MAGIQUES (si tu bloques)

- *"C'est un choix de simplification pour le MVP, en V2 j'aurais..."*
- *"J'ai utilisé OpenZeppelin car c'est audité et c'est le standard de l'industrie."*
- *"Le pattern approve/transferFrom est utilisé par tous les protocoles DeFi majeurs."*
- *"Le modifier nonReentrant bloque toute tentative de réentrance."*
- *"wagmi abstrait la complexité Web3, je n'ai qu'à appeler des hooks React."*

---

**Bonne chance ! 🍀**
