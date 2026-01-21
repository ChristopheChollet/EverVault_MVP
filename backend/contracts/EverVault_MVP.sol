// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title GreenVaultSimple - MVP Sepolia (sans stratégie)
/// @notice Vault simple qui accepte des dépôts USDC et émet des parts
contract GreenVaultSimple is ERC20, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    uint256 public totalValueLocked;

    // Frais de retrait (0.5%)
    uint256 public constant WITHDRAWAL_FEE = 50;
    address public feeRecipient;

    event Deposited(address indexed user, uint256 usdcAmount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 usdcAmount);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    error ZeroAmount();
    error InsufficientShares();
    error InsufficientBalance();
    error ZeroAddress();

    constructor(address _usdc) ERC20("GreenVault Shares", "gvUSDC") Ownable(msg.sender) {
        if (_usdc == address(0)) revert ZeroAddress();
        USDC = IERC20(_usdc);
        feeRecipient = msg.sender;
    }

    /// @notice Dépose des USDC et reçoit des parts
    /// @param usdcAmount Montant d'USDC à déposer (6 décimales)
    function deposit(uint256 usdcAmount) external nonReentrant whenNotPaused returns (uint256) {
        if (usdcAmount == 0) revert ZeroAmount();

        // Calcule les parts à émettre (1:1 pour la simplicité)
        uint256 shares = usdcAmount;

        // Transfère les USDC de l'utilisateur vers le contrat
        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Met à jour le TVL
        totalValueLocked += usdcAmount;

        // Émet les parts
        _mint(msg.sender, shares);

        emit Deposited(msg.sender, usdcAmount, shares);
        return shares;
    }

    /// @notice Retire des parts et récupère des USDC
    /// @param shares Nombre de parts à brûler
    function withdraw(uint256 shares) external nonReentrant whenNotPaused returns (uint256) {
        if (shares == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < shares) revert InsufficientShares();

        // Calcule le montant USDC (1:1 moins les frais)
        uint256 usdcAmount = shares;
        uint256 feeAmount = (usdcAmount * WITHDRAWAL_FEE) / 10000;
        uint256 netAmount = usdcAmount - feeAmount;

        // Vérifie que le contrat a assez d'USDC
        if (USDC.balanceOf(address(this)) < usdcAmount) revert InsufficientBalance();

        // Brûle les parts
        _burn(msg.sender, shares);

        // Met à jour le TVL
        totalValueLocked -= usdcAmount;

        // Transfère les USDC
        USDC.safeTransfer(msg.sender, netAmount);
        if (feeAmount > 0) {
            USDC.safeTransfer(feeRecipient, feeAmount);
        }

        emit Withdrawn(msg.sender, shares, netAmount);
        return netAmount;
    }

    /// @notice Retourne le prix d'une part (toujours 1:1 dans cette version)
    function getPricePerShare() public pure returns (uint256) {
        return 1e18; // 1 part = 1 USDC
    }

    /// @notice Met à jour le destinataire des frais
    function setFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, _recipient);
        feeRecipient = _recipient;
    }

    /// @notice Stoppe les dépôts/retraits (guardian)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Réactive les dépôts/retraits
    function unpause() external onlyOwner {
        _unpause();
    }
}

