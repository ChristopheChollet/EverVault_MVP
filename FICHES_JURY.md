# 📋 EverVault - Fiches pour la Soutenance Alyra

---

## 🎯 Pitch (30 secondes)

> "EverVault est un **vault DeFi** qui permet aux utilisateurs de déposer des USDC et recevoir des **parts tokenisées** (evUSDC) en échange. L'utilisateur peut retirer à tout moment en brûlant ses parts. C'est un MVP qui démontre les bases d'un protocole de yield farming, avec une V2 prévue intégrant Aave pour générer du rendement."

---

## 🏗️ Architecture du Projet

```
EverVault/
├── backend/              ← Smart Contracts (Solidity)
│   ├── contracts/
│   │   └── EverVaultSimple.sol   ← Contrat principal
│   └── scripts/
│       └── deploy-simple.ts      ← Script de déploiement
│
└── frontend/             ← Interface (Next.js)
    ├── components/
    │   ├── DepositForm.tsx       ← Formulaire dépôt
    │   ├── WithdrawForm.tsx      ← Formulaire retrait
    │   └── TVLDisplay.tsx        ← Affichage TVL
    └── app/
        └── page.tsx              ← Page principale
```

---

## 🔧 Stack Technique

| Catégorie | Technologies |
|-----------|--------------|
| **Smart Contract** | Solidity 0.8.28, Hardhat, OpenZeppelin |
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Blockchain** | Wagmi v2, Viem, RainbowKit |
| **Styling** | TailwindCSS |
| **Déploiement** | Vercel (frontend), Sepolia (contrat) |

---

## 📜 Le Contrat EverVaultSimple.sol

### Héritages
```solidity
contract EverVaultSimple is ERC20, ReentrancyGuard, Ownable
```

| Héritage | Rôle |
|----------|------|
| **ERC20** | Le vault EST un token (evUSDC = parts) |
| **ReentrancyGuard** | Protection contre les attaques de réentrance |
| **Ownable** | Contrôle d'accès admin |

---

## 💰 Fonction deposit()

```solidity
function deposit(uint256 usdcAmount) external nonReentrant returns (uint256) {
    if (usdcAmount == 0) revert ZeroAmount();
    
    uint256 shares = usdcAmount;                              // 1. Ratio 1:1
    USDC.safeTransferFrom(msg.sender, address(this), usdcAmount); // 2. Prend USDC
    totalValueLocked += usdcAmount;                           // 3. MAJ TVL
    _mint(msg.sender, shares);                                // 4. Mint parts
    
    emit Deposited(msg.sender, usdcAmount, shares);
    return shares;
}
```

### En français :
1. Vérifie que le montant n'est pas 0
2. Calcule les parts (1 USDC = 1 part)
3. Transfère les USDC de l'utilisateur vers le contrat
4. Augmente le TVL
5. Crée les tokens evUSDC pour l'utilisateur

---

## 🏧 Fonction withdraw()

```solidity
function withdraw(uint256 shares) external nonReentrant returns (uint256) {
    if (shares == 0) revert ZeroAmount();
    if (balanceOf(msg.sender) < shares) revert InsufficientShares();
    
    uint256 usdcAmount = shares;
    uint256 feeAmount = (usdcAmount * 50) / 10000;  // 0.5% frais
    uint256 netAmount = usdcAmount - feeAmount;
    
    _burn(msg.sender, shares);           // Brûle les parts
    totalValueLocked -= usdcAmount;      // MAJ TVL
    USDC.safeTransfer(msg.sender, netAmount);      // Envoie USDC
    USDC.safeTransfer(feeRecipient, feeAmount);    // Envoie frais
    
    emit Withdrawn(msg.sender, shares, netAmount);
    return netAmount;
}
```

### En français :
1. Vérifie que l'utilisateur a assez de parts
2. Calcule les frais (0.5%)
3. Détruit les tokens evUSDC
4. Diminue le TVL
5. Envoie les USDC (moins les frais)

---

## 🔄 Flux Approve + Deposit (Frontend)

```
1. Utilisateur entre un montant (ex: 0.1 USDC)

2. Clique sur "Approuver USDC"
   → Appelle USDC.approve(contractAddress, amount)
   → Autorise le contrat à prendre ses USDC

3. Clique sur "Déposer"
   → Appelle EverVault.deposit(amount)
   → Reçoit des parts evUSDC
```

### Pourquoi 2 étapes ?
> "C'est le standard ERC20. Avant qu'un contrat puisse prendre vos tokens, vous devez l'autoriser explicitement. C'est une mesure de sécurité."

---

## ❓ Questions Possibles du Jury

### Q1: "Pourquoi avoir retiré Aave ?"
> "Sur Sepolia, Aave utilise ses propres tokens de test incompatibles avec le USDC de Circle. Sur le mainnet, ça fonctionnerait car tout le monde utilise le même USDC."

### Q2: "C'est quoi le TVL ?"
> "Total Value Locked - le total des USDC déposés dans le contrat par tous les utilisateurs."

### Q3: "Pourquoi utiliser ReentrancyGuard ?"
> "Protection contre les attaques de réentrance (hack The DAO 2016). Empêche d'appeler withdraw() plusieurs fois avant la fin de la première transaction."

### Q4: "C'est quoi les parts (evUSDC) ?"
> "Token ERC20 représentant votre part dans le vault. 10% du TVL = 10% des parts."

### Q5: "Pourquoi SafeERC20 ?"
> "Certains tokens ne retournent pas true sur les transferts. SafeERC20 gère ces cas et revert si le transfert échoue."

### Q6: "Comment le frontend communique avec le contrat ?"
> "Wagmi (hooks React) + Viem. useWriteContract pour envoyer des transactions, useReadContract pour lire les données."

### Q7: "Pourquoi RainbowKit ?"
> "Facilite la connexion des wallets (MetaMask, WalletConnect, etc.) automatiquement."

---

## 📚 Vocabulaire Clé

| Terme | Définition |
|-------|------------|
| **Vault** | Coffre-fort qui garde les tokens |
| **TVL** | Total Value Locked - fonds déposés |
| **Shares/Parts** | Tokens représentant votre part |
| **Mint** | Créer de nouveaux tokens |
| **Burn** | Détruire des tokens |
| **Approve** | Autoriser un contrat à dépenser vos tokens |
| **Yield** | Rendement/intérêts générés |
| **ReentrancyGuard** | Protection contre les attaques |
| **Ownable** | Contrôle d'accès admin |

---

## 🚀 Évolutions V2

1. **Yield Generation** → Intégration Aave
2. **Auto-compound** → Chainlink Automation
3. **Multi-assets** → ETH, WBTC, DAI
4. **Gouvernance DAO** → Votes des holders
5. **Oracles Chainlink** → Prix en temps réel
6. **Déploiement L2** → Arbitrum, Optimism (frais réduits)

---

## 🔗 Liens Utiles

| Ressource | URL |
|-----------|-----|
| **App Vercel** | https://ever-vault-az0y15oml-chris-projects-99e19dc9.vercel.app/ |
| **Contrat Etherscan** | https://sepolia.etherscan.io/address/0x58E3cf7e9FD485CD5f36c5e330a4eCb178bA1B03 |
| **GitHub** | https://github.com/ChristopheChollet/EverVault_MVP |

---

## ✅ Checklist Jour J

- [ ] Carte d'identité
- [ ] MetaMask connecté sur Sepolia
- [ ] Assez de SepoliaETH (~0.05)
- [ ] Assez d'USDC test
- [ ] App Vercel ouverte
- [ ] Etherscan ouvert
- [ ] GitHub ouvert
- [ ] Ces fiches imprimées ou sur téléphone

---

**Bonne chance Christophe ! 🎓💪**

