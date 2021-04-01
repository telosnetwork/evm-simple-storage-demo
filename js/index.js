import Web3 from 'web3/dist/web3.min';
import "../style/style.css";

(function ($) {
  let web3 = new Web3(window.ethereum);
  const simpleStorageValue = $('#simple-storage-value');
  const setNewValueForm = $('#set-new-value-form');
  const errorMsg = $('#error-msg');
  const getValueBtn = $('#get-value');
  const metamaskErrorMsg = 'MetaMask is not installed.';
  const simpleStorageContract = new web3.eth.Contract([
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
    ], '0x03b5efE2CC85734907F6B8eEC04aA387c7E43a10');

  function showErrorMsg(msg){
    let errorMessage = msg || "Something went wrong. Try reload the page."
    const alert = $(errorMsg);
      alert.text(errorMessage)
      alert.addClass('show');
      setTimeout(() => {
        alert.removeClass('show');
      }, 4500);
  }

  if (window.ethereum) {
    window.ethereum.on('chainChanged', (_chainId) => {
      window.location.reload();
    });

    window.ethereum.on('disconnect', function (e){
      showErrorMsg('Lost connection to MetaMask. Try reload the page.');
    });
  }

  async function getAccounts() {
    return ethereum.request({method: 'eth_requestAccounts'});
  }

  async function getSimpleStorageValue() {
    return simpleStorageContract.methods.get().call();
  }

  async function changeSimpleStorageValue(newValue) {
    const accounts = await getAccounts();
    await simpleStorageContract.methods.set(newValue).send({from: accounts[0]});
  }

  $(setNewValueForm).on('submit', async function (e){
    e.preventDefault();
    if (window.ethereum){
      const data = $(setNewValueForm)[0];
      const form = new FormData(data);
      const newValue = form.get("number-input");
      try {
        await changeSimpleStorageValue(newValue);
      } catch (error) {
        if (error.code === -32002) {
          showErrorMsg('Please, connect to Metamask manually and try again.');
        } else {
          showErrorMsg(error.message);
        }
      }
    } else {
      showErrorMsg(metamaskErrorMsg);
    }
  })

  $(getValueBtn).on('click', async function (e){
    e.preventDefault();
    if (window.ethereum) {
      try {
        const value = await getSimpleStorageValue();
        simpleStorageValue.text('Value: ' + value.toString());
      } catch (error) {
        showErrorMsg(error.message);
      }
    } else {
      showErrorMsg(metamaskErrorMsg);
    }
  })

})(jQuery);
