import { useState, useEffect } from 'react';
import { 
  getXlmBalance, 
  fundWithFriendbot,
  StellarWalletsKit
} from './wallet';
import { 
  CONTRACT_ID, 
  XLM_TOKEN_CONTRACT_ID,
  getBillState, 
  createBillOnChain, 
  payShareOnChain, 
  claimFundsOnChain,
  type BillStateData
} from './contract';
import { 
  Wallet, 
  User, 
  Plus, 
  Trash2, 
  DollarSign, 
  Info, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Settings
} from 'lucide-react';

function App() {
  // Wallet State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [xlmBalance, setXlmBalance] = useState<string>("0");
  const [isFunded, setIsFunded] = useState<boolean>(true);
  const [isWalletConnecting, setIsWalletConnecting] = useState<boolean>(false);

  // Contract Config State
  const [currentContractId, setCurrentContractId] = useState<string>(CONTRACT_ID);
  const [customContractInput, setCustomContractInput] = useState<string>("");
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Create Bill Form State
  const [billDesc, setBillDesc] = useState<string>("Dinner");
  const [totalAmount, setTotalAmount] = useState<string>("30");
  const [participantInput, setParticipantInput] = useState<string>("");
  const [participants, setParticipants] = useState<string[]>([]);

  // Active Bill State
  const [activeBill, setActiveBill] = useState<BillStateData | null>(null);
  const [isLoadingBillState, setIsLoadingBillState] = useState<boolean>(false);

  // App Loading / Feedback States
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Check if wallet was previously connected or setup listener
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { address } = await StellarWalletsKit.getAddress();
        if (address) {
          setWalletAddress(address);
          fetchBalance(address);
        }
      } catch (e) {
        // No wallet connected yet
      }
    };
    checkConnection();
  }, []);

  // Fetch Wallet Balance
  const fetchBalance = async (address: string) => {
    try {
      const { balance, isFunded: funded } = await getXlmBalance(address);
      setXlmBalance(balance);
      setIsFunded(funded);
    } catch (e: any) {
      setErrorMessage(`Error fetching balance: ${e.message || e}`);
    }
  };

  // Connect Wallet Flow (StellarWalletsKit modal)
  const handleConnect = async () => {
    setIsWalletConnecting(true);
    setErrorMessage(null);
    try {
      const result = await StellarWalletsKit.authModal();
      if (result && result.address) {
        setWalletAddress(result.address);
        fetchBalance(result.address);
      }
    } catch (e: any) {
      setErrorMessage(`Connection modal failed: ${e.message || e}`);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  // Disconnect Wallet
  const handleDisconnect = async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch (e) {
      console.error("Disconnect failed", e);
    }
    setWalletAddress(null);
    setXlmBalance("0");
    setIsFunded(true);
    setStatusMessage(null);
    setTxHash(null);
  };

  // Request Testnet XLM from Faucet
  const handleFundFaucet = async () => {
    if (!walletAddress) return;
    setStatusMessage("Requesting testnet XLM from Friendbot faucet...");
    setErrorMessage(null);
    try {
      await fundWithFriendbot(walletAddress);
      setStatusMessage("Account successfully funded!");
      await fetchBalance(walletAddress);
    } catch (e: any) {
      setErrorMessage(`Friendbot funding failed: ${e.message || e}`);
    } finally {
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Add Participant to Form List
  const handleAddParticipant = () => {
    const addr = participantInput.trim();
    if (!addr) return;
    if (!addr.startsWith("G") || addr.length !== 56) {
      setErrorMessage("Invalid Stellar public key format (must start with G and be 56 characters)");
      return;
    }
    if (participants.includes(addr)) {
      setErrorMessage("Participant address already added");
      return;
    }
    setParticipants([...participants, addr]);
    setParticipantInput("");
    setErrorMessage(null);
  };

  // Remove Participant from Form List
  const handleRemoveParticipant = (index: number) => {
    const updated = [...participants];
    updated.splice(index, 1);
    setParticipants(updated);
  };

  // Load active bill details from contract
  const loadBillDetails = async (contractIdToLoad: string = currentContractId) => {
    if (contractIdToLoad === "CCK5BOUB7Y7GSP2J2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P2P") {
      // Don't try loading placeholder contract ID
      return;
    }
    setIsLoadingBillState(true);
    setErrorMessage(null);
    try {
      const data = await getBillState(contractIdToLoad);
      setActiveBill(data);
    } catch (e: any) {
      console.error("Failed to load bill", e);
      setActiveBill(null);
    } finally {
      setIsLoadingBillState(false);
    }
  };

  // Load bill details on startup or when contract ID changes
  useEffect(() => {
    loadBillDetails(currentContractId);
  }, [currentContractId]);

  // Apply custom contract address
  const handleApplyContract = () => {
    const addr = customContractInput.trim();
    if (addr.length !== 56) {
      setErrorMessage("Stellar contract ID must be 56 characters long.");
      return;
    }
    setCurrentContractId(addr);
    setShowSettings(false);
    setStatusMessage("Contract configuration updated!");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Submit/Create Bill On-Chain
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    if (participants.length === 0) {
      setErrorMessage("Please add at least one participant.");
      return;
    }
    const amt = parseFloat(totalAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage("Please enter a valid total amount.");
      return;
    }

    setErrorMessage(null);
    setTxHash(null);
    // Include the organizer as part of the split participants list automatically
    const allParticipants = Array.from(new Set([walletAddress, ...participants]));

    try {
      const hash = await createBillOnChain(
        walletAddress,
        XLM_TOKEN_CONTRACT_ID,
        billDesc,
        amt,
        allParticipants,
        (status) => setStatusMessage(status),
        currentContractId
      );
      setTxHash(hash);
      setStatusMessage("Bill successfully initialized on-chain!");
      await loadBillDetails(currentContractId);
      await fetchBalance(walletAddress);
      // Clear form
      setParticipants([]);
      setBillDesc("Dinner");
    } catch (err: any) {
      console.error(err);
      // Detailed error type parsing (Requirement: 3 error types handled)
      if (err.message && err.message.includes("User declined")) {
        setErrorMessage("Wallet Error: Signature request was rejected by the user.");
      } else if (err.message && err.message.includes("insufficient")) {
        setErrorMessage("Transaction Error: Insufficient wallet balance to cover total amount or network fee.");
      } else if (err.message && err.message.includes("404")) {
        setErrorMessage("Network Error: Account or contract not found on the Stellar network.");
      } else {
        setErrorMessage(`Contract Error: ${err.message || err}`);
      }
      setStatusMessage(null);
    }
  };

  // Pay Participant Share
  const handlePayShare = async () => {
    if (!walletAddress) return;
    setErrorMessage(null);
    setTxHash(null);
    try {
      const hash = await payShareOnChain(
        walletAddress,
        (status) => setStatusMessage(status),
        currentContractId
      );
      setTxHash(hash);
      setStatusMessage("Payment completed successfully!");
      await loadBillDetails(currentContractId);
      await fetchBalance(walletAddress);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("User declined")) {
        setErrorMessage("Wallet Error: Signature request was rejected by the user.");
      } else if (err.message && err.message.includes("insufficient")) {
        setErrorMessage("Transaction Error: Insufficient balance to pay your share.");
      } else {
        setErrorMessage(`Payment failed: ${err.message || err}`);
      }
      setStatusMessage(null);
    }
  };

  // Withdraw ESCROW Funds (Organizer Only)
  const handleClaimFunds = async () => {
    if (!walletAddress) return;
    setErrorMessage(null);
    setTxHash(null);
    try {
      const hash = await claimFundsOnChain(
        walletAddress,
        (status) => setStatusMessage(status),
        currentContractId
      );
      setTxHash(hash);
      setStatusMessage("Escrow funds successfully withdrawn!");
      await loadBillDetails(currentContractId);
      await fetchBalance(walletAddress);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Withdrawal failed: ${err.message || err}`);
      setStatusMessage(null);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <TrendingUp className="brand-logo" />
          <div className="brand-texts">
            <h1 className="brand-title">Achievo</h1>
            <p className="brand-subtitle">Soroban Split Bill Manager</p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="settings-toggle-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Configure Contract Settings"
          >
            <Settings className="icon" />
          </button>
          
          {walletAddress ? (
            <div className="wallet-info-badge">
              <div className="wallet-balance">
                <span className="balance-val">{parseFloat(xlmBalance).toFixed(2)}</span>
                <span className="balance-lbl">XLM</span>
              </div>
              <div className="wallet-address" title={walletAddress}>
                <User className="icon" />
                <span>{walletAddress.slice(0, 5)}...{walletAddress.slice(-4)}</span>
              </div>
              <button className="btn-disconnect" onClick={handleDisconnect}>Disconnect</button>
            </div>
          ) : (
            <button 
              className="btn-connect-wallet"
              onClick={handleConnect}
              disabled={isWalletConnecting}
            >
              <Wallet className="icon" />
              {isWalletConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Unfunded Alert */}
        {walletAddress && !isFunded && (
          <div className="alert-banner warning">
            <ShieldAlert className="alert-icon" />
            <div className="alert-text">
              <h4>Unfunded Account Detected</h4>
              <p>Your connected account has 0 XLM. You need to fund it with testnet XLM to perform operations.</p>
            </div>
            <button className="btn-alert-action" onClick={handleFundFaucet}>
              <RefreshCw className="icon" /> Faucet Fund (10,000 XLM)
            </button>
          </div>
        )}

        {/* Global Error Banners */}
        {errorMessage && (
          <div className="alert-banner error">
            <XCircle className="alert-icon" />
            <div className="alert-text">
              <h4>Operation Failed</h4>
              <p>{errorMessage}</p>
            </div>
            <button className="btn-alert-close" onClick={() => setErrorMessage(null)}>×</button>
          </div>
        )}

        {/* Global Transaction Status Messages */}
        {statusMessage && (
          <div className="alert-banner info">
            <Info className="alert-icon spin" />
            <div className="alert-text">
              <h4>Processing Transaction</h4>
              <p>{statusMessage}</p>
            </div>
          </div>
        )}

        {/* Successful Transaction Output */}
        {txHash && (
          <div className="alert-banner success">
            <CheckCircle className="alert-icon" />
            <div className="alert-text">
              <h4>Transaction Completed</h4>
              <p>The transaction settled on the Stellar Testnet ledger successfully!</p>
              <a 
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="tx-explorer-link"
              >
                View on StellarExpert <ExternalLink className="inline-icon" />
              </a>
            </div>
            <button className="btn-alert-close" onClick={() => setTxHash(null)}>×</button>
          </div>
        )}

        {/* Contract Settings Section */}
        {showSettings && (
          <section className="dashboard-section settings-section animate-fade">
            <h3>⚙️ Deployed Smart Contract ID Config</h3>
            <p className="description-text">
              By default, we utilize a pre-deployed Split Bill contract. You can override it with your own contract ID below:
            </p>
            <div className="input-group">
              <input 
                type="text" 
                className="text-input" 
                placeholder="Enter contract ID (e.g. C...)" 
                value={customContractInput}
                onChange={(e) => setCustomContractInput(e.target.value)}
              />
              <button className="btn-action" onClick={handleApplyContract}>Apply</button>
            </div>
            <p className="active-contract-indicator">
              Currently Active: <code>{currentContractId}</code>
            </p>
          </section>
        )}

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          
          {/* Column 1: Create Bill Form */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Split Bill Calculator</h2>
              <span className="badge">On-Chain Setup</span>
            </div>

            <form onSubmit={handleCreateBill} className="bill-setup-form">
              <div className="form-group">
                <label>Bill Description</label>
                <input 
                  type="text" 
                  className="text-input"
                  required
                  placeholder="e.g. Pizza Night"
                  value={billDesc}
                  onChange={(e) => setBillDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Total Bill Amount (XLM)</label>
                <div className="amount-input-wrapper">
                  <DollarSign className="input-decorator" />
                  <input 
                    type="number" 
                    className="text-input decorated"
                    required
                    min="1"
                    step="0.01"
                    placeholder="30.00"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Add Participant Address</label>
                <div className="input-action-wrapper">
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="Enter G... address" 
                    value={participantInput}
                    onChange={(e) => setParticipantInput(e.target.value)}
                  />
                  <button type="button" className="btn-icon-add" onClick={handleAddParticipant}>
                    <Plus />
                  </button>
                </div>
                <span className="info-text">Note: Your connected address is automatically added.</span>
              </div>

              <div className="participants-list">
                <label>Added Participants ({participants.length + (walletAddress ? 1 : 0)})</label>
                <div className="list-scroller">
                  {walletAddress && (
                    <div className="participant-row self">
                      <span className="index-indicator">Org</span>
                      <span className="address-hash" title={walletAddress}>{walletAddress.slice(0, 12)}...{walletAddress.slice(-12)} (You)</span>
                    </div>
                  )}

                  {participants.map((p, idx) => (
                    <div key={p} className="participant-row">
                      <span className="index-indicator">#{idx + 1}</span>
                      <span className="address-hash" title={p}>{p.slice(0, 12)}...{p.slice(-12)}</span>
                      <button 
                        type="button" 
                        className="btn-row-remove"
                        onClick={() => handleRemoveParticipant(idx)}
                      >
                        <Trash2 className="row-icon" />
                      </button>
                    </div>
                  ))}
                  
                  {participants.length === 0 && !walletAddress && (
                    <div className="empty-state">No participants added yet.</div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-submit-bill"
                disabled={!walletAddress || participants.length === 0}
              >
                Create Bill Split <ArrowRight className="btn-icon" />
              </button>
            </form>
          </section>

          {/* Column 2: Active Bill Status Dashboard */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Active Bill Escrow</h2>
              <span className={`badge ${activeBill ? 'active' : 'inactive'}`}>
                {activeBill ? 'On-Chain Sync' : 'No Active Bill'}
              </span>
            </div>

            {isLoadingBillState ? (
              <div className="bill-loading-state">
                <RefreshCw className="spin-icon" />
                <p>Syncing status with Stellar Soroban ledger...</p>
              </div>
            ) : activeBill ? (
              <div className="bill-dashboard-view">
                
                {/* Bill Header Info Card */}
                <div className="bill-info-card">
                  <div className="card-top">
                    <h3>{activeBill.description}</h3>
                    <span className="total-badge">{activeBill.totalAmount.toFixed(2)} XLM</span>
                  </div>
                  <div className="card-splits">
                    <div className="split-item">
                      <span className="lbl">Total Split</span>
                      <span className="val">{activeBill.participants.length} Ways</span>
                    </div>
                    <div className="split-item">
                      <span className="lbl">Share / Person</span>
                      <span className="val highlight">{activeBill.sharePerPerson.toFixed(2)} XLM</span>
                    </div>
                  </div>
                  <div className="card-organizer">
                    <span className="lbl">Organizer:</span>
                    <span className="val" title={activeBill.organizer}>
                      {activeBill.organizer.slice(0, 6)}...{activeBill.organizer.slice(-6)}
                    </span>
                  </div>
                </div>

                {/* Real-time Checklist */}
                <div className="bill-status-list">
                  <label>Participant Payment Status (Real-time Sync)</label>
                  <div className="status-scroller">
                    {activeBill.participants.map((p, idx) => {
                      const isSelf = p.address === walletAddress;
                      return (
                        <div key={p.address} className={`status-row ${p.hasPaid ? 'paid' : 'pending'} ${isSelf ? 'highlight-self' : ''}`}>
                          <div className="row-user">
                            <span className="indicator">{idx + 1}</span>
                            <span className="address-lbl" title={p.address}>
                              {p.address.slice(0, 8)}...{p.address.slice(-8)}
                              {isSelf && " (You)"}
                            </span>
                          </div>
                          
                          <div className="row-status">
                            {p.hasPaid ? (
                              <span className="status-badge success">
                                <CheckCircle className="icon" /> Paid
                              </span>
                            ) : (
                              <span className="status-badge pending">
                                <Info className="icon" /> Pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dashboard Actions */}
                <div className="bill-dashboard-actions">
                  
                  {/* Action 1: Pay Share */}
                  {walletAddress && 
                   activeBill.participants.some(p => p.address === walletAddress && !p.hasPaid) && (
                    <button className="btn-action-pay" onClick={handlePayShare}>
                      <DollarSign className="icon" /> Pay My Share ({activeBill.sharePerPerson.toFixed(2)} XLM)
                    </button>
                  )}

                  {/* Action 2: Claim Funds (Organizer only) */}
                  {walletAddress === activeBill.organizer && (
                    <button className="btn-action-claim" onClick={handleClaimFunds}>
                      <RefreshCw className="icon" /> Claim Escrowed Funds
                    </button>
                  )}
                  
                </div>

              </div>
            ) : (
              <div className="bill-empty-state">
                <Info className="empty-icon" />
                <h3>No active bill tracked</h3>
                <p>
                  Create a new bill split in the calculator or customize the contract configuration to sync with an existing bill split escrow.
                </p>
              </div>
            )}
          </section>

        </div>

      </main>
    </div>
  );
}

export default App;
