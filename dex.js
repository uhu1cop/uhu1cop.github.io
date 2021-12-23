/* Moralis init code */
const serverUrl = "https://gmhqwxjozdpj.usemoralis.com:2053/server";
const appId = "wjNkJIHIcazJILysWrnDoeFttGX4oh832w5ax2e4";

Moralis.start({ serverUrl, appId });

//Moralis.initialize('wjNkJIHIcazJILysWrnDoeFttGX4oh832w5ax2e4');
//Moralis.serverURL = 'https://gmhqwxjozdpj.usemoralis.com:2053/server';

Moralis.initPlugins().then(() => console.log('Plugins have been initialized'));

const $tokenBalanceTBody = document.querySelector(".js-token-balances");
const $selectedToken = document.querySelector('.js-from-token');
const $amountInput = document.querySelector('.js-from-amount');

const tokenValue = (value, decimals) =>
    (decimals ? value / Math.pow(10, decimals) : value);

/* Authentication code */
async function login() {
    let user = Moralis.User.current();
    if (!user) {
        user = await Moralis.authenticate();
    }
    console.log("logged in user:", user);
    getStats();
}

async function initSwapForm(event) {
    event.preventDefault();
    $selectedToken.innerText = event.target.dataset.symbol;
    $selectedToken.dataset.address = event.target.dataset.address;
    $selectedToken.dataset.decimals = event.target.dataset.decimals;
    $selectedToken.dataset.max = event.target.dataset.max;
    $amountInput.removeAttribute('disabled');
    $amountInput.value = '';
    document.querySelector('.js-submit').removeAttribute('disabled');
    document.querySelector('.js-cancel').removeAttribute('disabled');
    document.querySelector('.js-quote-container').innerHTML = '';

}

async function getStats() {
    const balances = await Moralis.Web3API.account.getTokenBalances({
        address: '0x4724f0bE3801E7A757Cb9bf6A47d85BDc9f32e45'
    });
    console.log(balances, "balances");
    $tokenBalanceTBody.innerHTML = balances.map((token, index) => `
      <tr>
          <td>${index + 1}</td>
          <td>${token.symbol}</td>
          <td>${tokenValue(token.balance, token.decimals)}</td>
          <td>
            <button class='js-swap btn btn-success' 
                data-address="${token.token_address}"
                data-symbol="${token.symbol}"
                data-decimals="${token.decimals}"
                data-max="${tokenValue(token.balance, token.decimals)}"
            >
                Swap
            </button>
          </td>
      </tr>
    `).join('');

    for (let $btn of $tokenBalanceTBody.querySelectorAll('button')) {
        $btn.addEventListener('click', initSwapForm);
    }
}

async function buyCrypto() {
    Moralis.Plugins.fiat.buy();
}

async function logOut() {
    await Moralis.User.logOut();
    console.log("logged out");
}

document.querySelector("#btn-login").addEventListener("click", login);
document.getElementById('btn-buy-crypto').addEventListener('click', buyCrypto);
document.getElementById("btn-logout").addEventListener("click", logOut);


/** Quote / Swap */
async function formSubmitted(event) {
    event.preventDefault();
    const fromAmount = Number.parseFloat($amountInput.value);
    const fromMaxValue = Number.parseFloat($selectedToken.dataset.max);
    if (Number.isNaN(fromAmount) || fromAmount > fromMaxValue) {
        //invalid input
        document.querySelector('.js-amount-error').innerText = 'Invalid amount';
        return;
    } else {
        document.querySelector('.js-amount-error').innerText = '';
    }

    // Submission of the quote request
    const fromDecimals = $selectedToken.dataset.decimals;
    const fromTokenAddress = $selectedToken.dataset.address;

    const [toTokenAddress, toDecimals] = document.querySelector('[name=to-token]').value.split('-');
    console.log(toTokenAddress, toDecimals);

    try {
        const quote = await Moralis.Plugins.oneInch.quote({
            chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
            fromTokenAddress, //fromTokenAddress: fromTokenAddress, // The token you want to swap
            toTokenAddress,   //toTokenAddress: toTokenAddress, // The token you want to receive
            amount: Moralis.Units.Token(fromAmount, fromDecimals).toString(),
        });
        const toAmount = tokenValue(quote.toTokenAmount, toDecimals);
        document.querySelector('.js-quote-container').innerHTML = `
                <p>
                    ${fromAmount} ${quote.fromToken.symbol} = 
                    ${toAmount} ${quote.toToken.symbol} 
                </p>
                <p>
                    Gass fee: ${quote.estimatedGas}
                </p>
                <button class="btn btn-success">Perform swap</button>
            `;
        console.log(fromAmount);

    } catch (e) {
        document.querySelector('.js-quote-container').innerHTML = `
            <p class="error">The conversion didn't succedd.</p>
        `;
    }

}

async function formCanceled(event) {
    event.preventDefault();
    document.querySelector('.js-submit').removeAttribute('disabled', '');
    document.querySelector('.js-cancel').removeAttribute('disabled', '');
    $amountInput.value = '';
    $amountInput.setAttribute('disabled', '');
    delete $selectedToken.dataset.address;
    delete $selectedToken.dataset.decimals;
    delete $selectedToken.dataset.max;

    document.querySelector('.js-quote-container').innerHTML = '';

}

document.querySelector('.js-submit').addEventListener('click', formSubmitted);
document.querySelector('.js-cancel').addEventListener('click', formCanceled);


// To Token DropDown
async function getTop10Tokens() {
    const response = await fetch("https://api.coinpaprika.com/v1/coins");
    const tokens = await response.json();

    return tokens
        .filter((token) => token.rank >= 1 && token.rank <= 30)
        .map((token) => token.symbol);
}

async function getTickerData(tickerList) {

    const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
    });
    console.log(tokens);
    const tokenList = Object.values(tokens.tokens);

    return tokenList.filter(token => tickerList.includes(token.symbol));


    /*
    try {
        const response = await fetch("https://api.1inch.io/v4.0/56/tokens");
        const tokens = await response.json();
        const tokenList = Object.values(tokens.tokens);
        return tokenList.filter((token) => tickerList.includes(token.symbol));
    } catch (err) {
        console.log(err);
    } */
}

function renderTokenDropdown(tokens) {
    const options = tokens.map(token =>
        `<option value="${token.address}-${token.decimals}">
            ${token.name}
        </option>
    `).join('');
    document.querySelector('[name=to-token]').innerHTML = options;
}

getTop10Tokens()
    .then(getTickerData)
    .then(renderTokenDropdown);
