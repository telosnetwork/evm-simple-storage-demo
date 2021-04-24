import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import "../style/style.css";
import Web3 from 'web3/dist/web3.min';
import WalletConnectProvider from "@walletconnect/web3-provider";
import { TelosEvmApi } from '@telosnetwork/telosevm-js/dist/telosevm-js.umd';
import fetch from "node-fetch";
import { Keycat } from 'keycatjs';
import Web3EthAbi from 'web3-eth-abi';
import { UALJs } from 'ual-plainjs-renderer';
import { Scatter } from 'ual-scatter';
import { Anchor } from 'ual-anchor';
const EthereumTx = require('ethereumjs-tx');


(function ($) {
  let web3;
  let loggedInUser;
  let accountName;
  let permission;
  let publicKey;
  let walletService;
  const simpleStorageValue = $('#simple-storage-value');
  const setNewValueForm = $('#set-new-value-form');
  const getValueBtn = $('#get-value');
  const setValueBtn = $('#set-new-value-form button');
  const keycatBtn = $('#keycat');
  const telosTestnetChainId = 41;
  const appName = 'Simple storage';
  const telosTestnetUrl = "https://testnet.telos.caleos.io";
  const telosTestnetProviderUrl = "https://testnet.telos.net/evm"
  const evmContractAccount = "eosio.evm";
  const successfulValueSettingMsg = "New value is set successfully!";
  const noEvmAccountErrorMsg = "The transaction was not sent because your account does not have an EVM address."
  const noWalletErrorMsg = 'No wallet selected.';
  const simpleStorageContractAddress = '0x03b5efE2CC85734907F6B8eEC04aA387c7E43a10';
  const keycat = new Keycat({
    blockchain: {
      name: 'telos',
      nodes: [telosTestnetUrl],
    }
  });
  const api = new TelosEvmApi({
    endpoint: telosTestnetUrl,
    chainId: telosTestnetChainId,
    ethPrivateKeys: [],
    telosContract: evmContractAccount,
    fetch,
    telosPrivateKeys: [],
  });
  const contractAbi = [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "x",
          "type": "uint256"
        }
      ],
      "name": "set",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "get",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
  const telosTestnetChain = {
    chainId: "1eaa0824707c8c16bd25145493bf062aecddfeb56c736f6ba6397f3195f33c9f",
    rpcEndpoints: [{
      protocol: "https",
      host: "testnet.telos.caleos.io",
      port: 443,
    }]
  };
  const txConf = {broadcast: true, blocksBehind: 3, expireSeconds: 30};

  if (navigator.userAgent.indexOf("Firefox") !== -1) {
    $(keycatBtn).remove();
  }

  function getContract() {
    const web3 = new Web3(new Web3.providers.HttpProvider(telosTestnetProviderUrl));
    return new web3.eth.Contract(contractAbi, simpleStorageContractAddress);
  }

  function showMsg(msg, isErrorMsg){
    let message = isErrorMsg ? msg || "Something went wrong. Try reload the page." : msg;
    const alert = $('#msg');
    alert.text(message);
    alert.addClass('show');
    const alertType = isErrorMsg ? "alert-danger" : "alert-success";
    alert.addClass(alertType);
    setTimeout(() => {
      alert.removeClass('show');
      alert.removeClass(alertType);
    }, 4500);
  }

  async function getAccounts() {
    return await web3.eth.getAccounts();
  }

  async function getNonce (account){
    return web3.eth.getTransactionCount(account);
  }

  function getFunctionSignature(contractFunction) {
    return Web3EthAbi.encodeFunctionSignature(contractFunction);
  }

  async function getEvmAccountByTelosAccount(telosAccountName) {
    return await api.telos.getEthAccountByTelosAccount(telosAccountName)
      .catch(async function(error) {
        const errorMessage = error.message;
        if (errorMessage.includes('No address associated with')) {
          const isUserWantCreateEvmAccount = confirm("You don't have EVM address for Telos account, do you want to create one?");
          if (isUserWantCreateEvmAccount) {
            try {
              await loggedInUser.signTransaction({
                actions: [{
                  account: evmContractAccount,
                  name: 'create',
                  authorization: [{
                    actor: telosAccountName,
                    permission: permission,
                  }],
                  data: {
                    account: telosAccountName,
                    data: ""
                  },
                }]
              }, txConf);
              showMsg("EVM account was created successfully!", false)
              return await api.telos.getEthAccountByTelosAccount(telosAccountName);
            } catch (error) {
              showMsg(error.message, true);
            }
          }
        }
        else {
          showMsg(errorMessage, true);
        }
      }
    )
  }

  function getTransactionObject(newValue, nonce, from_address) {
    return {
      "nonce": nonce,
      "from": from_address,
      "to": simpleStorageContractAddress,
      "data": getFunctionSignature('set(uint256)') + Number(newValue).toString(16).padStart(64, "0"),
      "gasPrice": 22200000000000,
      "gas": 5000000,
      "value": 0
    }
  }

  async function getTransaction(newValue, telosAccountName) {
    const evmAccount = await getEvmAccountByTelosAccount(telosAccountName);
    if (evmAccount) {
      const ethereumTx = new EthereumTx(getTransactionObject(newValue, evmAccount.nonce, evmAccount.address));
      return {
        actions: [{
          account: evmContractAccount,
          name: 'raw',
          authorization: [{
            actor: telosAccountName,
            permission: permission,
          }],
          data: {
            ram_payer: evmContractAccount,
            tx: ethereumTx.serialize().toString('hex'),
            estimate_gas: false,
            sender: evmAccount.address.slice(2)
          }
        }]
      }
    } else {
      showMsg(noEvmAccountErrorMsg, true);
    }
  }

  async function setWeb3Provider(provider){
    await provider.enable();
    web3 = new Web3(provider);
    provider.on("chainChanged", (chainId) => {
      if (chainId !== "0x" + (telosTestnetChainId).toString(16)) {
        showMsg('Your chain id = ' + chainId + '. Please, change the network to Telos Testnet.', true);
      }
    });
  }

  $("#metamask").on('click', function (e){
    $("#close-modal").click();
    if (window.ethereum) {
      setWeb3Provider(window.ethereum).then();
      walletService = 'metamask';
    } else {
      showMsg("Metamask is not installed or not active.", true);
    }
  })

  $("#wallet-connect").on('click', async function (e){
    $("#close-modal").click();
    const provider = new WalletConnectProvider({
      rpc: {
        [telosTestnetChainId]: telosTestnetProviderUrl
      }
    });
    setWeb3Provider(provider).then();
    walletService = "walletConnect";
  })

  $(keycatBtn).on('click', async function (e) {
    try {
      ({ accountName, permission, publicKey } = await keycat.signin());
      $("#close-modal").click();
      walletService = "keycat";
    } catch (error) {
      if (error !== "closed") {
        showMsg(error.message, true);
      }
    }
  })

  async function web3SignTransaction(newValue) {
    const accounts = await getAccounts();
    const selectedAccount = accounts[0];
    const nonce = await getNonce(selectedAccount);
    const chainId = await web3.eth.getChainId();
    try {
      if (chainId !== telosTestnetChainId){
       showMsg('Your chain id = ' + chainId + '. Please, change the network to Telos Testnet.', true);
      } else {
        await web3.eth.sendTransaction(getTransactionObject(newValue, nonce, selectedAccount));
        showMsg(successfulValueSettingMsg, false);
      }
    } catch (error) {
      showMsg(error.message, true);
    }
  }

  async function notWeb3signTransaction(newValue, telosAccountName) {
    try {
      const tx = await getTransaction(newValue, telosAccountName);
      if (tx) {
        if (walletService === "ual") {
          await loggedInUser.signTransaction(tx, txConf);
          showMsg(successfulValueSettingMsg, false);
        } else if (walletService === "keycat") {
          await keycat.account(telosAccountName).transact(tx, txConf);
          showMsg(successfulValueSettingMsg, false);
        }
      }
    } catch (error) {
      if (error !== "closed" ) {
        showMsg(error.message + ". Perhaps, the sender's balance is too low to pay for gas.", true);
      }
    }
  }

  function getSimpleStorageValue() {
    return getContract().methods.get().call();
  }

  $(getValueBtn).on('click', async function (e){
    e.preventDefault();
    try {
      const value = await getSimpleStorageValue();
      if (value){
        simpleStorageValue.text('Value: ' + value.toString());
      }
    } catch (error) {
      showMsg(error.message, true);
    }
  })

  $(setNewValueForm).on('submit', async function (e){
    e.preventDefault();
    const data = $(setNewValueForm)[0];
    const form = new FormData(data);
    const newValue = form.get("number-input");
    if (walletService === "metamask" || walletService === "walletConnect") {
      try {
        setValueBtn.prop('disabled', true);
        await web3SignTransaction(newValue);
      } catch (error) {
        if (error.code === -32002) {
          showMsg('Please, connect to Metamask manually and try again.', true);
        } else {
          showMsg(error.message, true);
        }
      }
    } else if (walletService === "keycat" || walletService === "ual") {
      setValueBtn.prop('disabled', true);
      await notWeb3signTransaction(newValue, accountName);
    }
    else {
      showMsg(noWalletErrorMsg, true);
    }
    setValueBtn.prop('disabled', false);
  });

  function initWallets(){
    const scatter = new Scatter([telosTestnetChain], {appName: appName});
    const anchor = new Anchor([telosTestnetChain], {
       appName: appName
    });
    const ual = new UALJs(
      async arrayOfUsers => {
        loggedInUser = arrayOfUsers[0];
        accountName = await loggedInUser.getAccountName();
        const ualActiveAuthenticator = ual.activeAuthenticator.getName();
        if (ualActiveAuthenticator === "Scatter") {
          permission = loggedInUser.scatter.identity.accounts[0].authority;
        } else if (ualActiveAuthenticator === "anchor") {
          permission = loggedInUser.requestPermission;
        }
        walletService = "ual";
        $("#close-modal").click();
      },
      [telosTestnetChain],
      appName,
      [scatter, anchor],
      {containerElement: $('#ual')[0]}
    );
    ual.init();

    const provider = new WalletConnectProvider({
      rpc: {
        [telosTestnetChainId]: telosTestnetProviderUrl
      }
    });
    if (provider.wc.accounts.length > 0) {
      provider.disconnect().then();
    }
  }

  initWallets();

})(jQuery);
