import Web3 from "web3"
import * as dotenv from "dotenv";
import Common from "@ethereumjs/common";
import {AbiItem} from 'web3-utils';
import {FeeMarketEIP1559Transaction} from "@ethereumjs/tx";

dotenv.config();

const swapAssets =async ():Promise<any> => {

    const web3 = new Web3(new Web3.providers.HttpProvider(process.env.rpcRopstenURL));
    const uniswapV3RouterABI =  require("./ABI/UniswapV3RouterABI");
    const swapContract = new web3.eth.Contract( uniswapV3RouterABI as AbiItem[],process.env.UniswapV3RopstenRouterAddress);
    
    const activeAccount = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);

    const expiryDate = Math.floor(Date.now() / 1000) + 900;
  
    const qty = web3.utils.toWei('0.0001', 'ether');

    const params = {
        tokenIn: "0xc778417e063141139fce010982780140aa0cd5ab", // Wrapped Ether (WETH)
        tokenOut: "0xaD6D458402F60fD3Bd25163575031ACDce07538D", //0x31F42841c2db5173425b5223809CF3A38FEde360 // Dai Stable Coin
        fee: 3000,
        recipient: activeAccount.address,
        deadline: expiryDate,
        amountIn: qty,
        amountOutMinimum: '0', //Slippage
        sqrtPriceLimitX96: '0'
      };

  
      let tx_builder = swapContract.methods.exactInputSingle(params);
      let encoded_tx = tx_builder.encodeABI();


      const privateKey = Buffer.from( process.env.PRIVATE_KEY.replace( '0x' , '' ) , 'hex' );
      var chain = new Common( { chain : 'ropsten', hardfork : 'london' } );
      const txNonce = await web3.eth.getTransactionCount(activeAccount.address, 'pending');

      //@ts-ignore
      var basefees= web3.utils.toNumber((await web3.eth.getBlock('latest')).baseFeePerGas);
      console.log("basefees:",basefees);
      var maxFeesPerGas = (basefees*2)+2;

      const rawTx = {
        "to"                    :   web3.utils.toHex( process.env.UniswapV3RopstenRouterAddress ), //Contract Address
        "gasLimit"              :   web3.utils.toHex( 4300000 ),
        "maxFeePerGas"          :   web3.utils.toHex( web3.utils.toWei(String(maxFeesPerGas), 'gwei' ) ),
        "maxPriorityFeePerGas"  :   web3.utils.toHex( web3.utils.toWei( '2' , 'gwei' ) ),
        "value"                 :   web3.utils.toHex( web3.utils.toWei( '0.0001' , 'ether' ) ),
        "data"                  :   web3.utils.toHex( encoded_tx ),
        "nonce"                 :   web3.utils.toHex( txNonce ),
        "chainId"               :   "0x03",
        //"accessList"          :   [],
        "type"                  :   "Swap" //"0x02"
    };
    const tx = FeeMarketEIP1559Transaction.fromTxData( rawTx , { chain } );

    const signedTransaction = tx.sign( privateKey );

    const serializedTransaction = '0x' + signedTransaction.serialize().toString( 'hex' );

    var walletBalance = await web3.eth.getBalance(activeAccount.address);

    console.log( "Balance: " + walletBalance );

    const txHash = await web3.utils.sha3( serializedTransaction );
    console.log( "Tx Hash: " + txHash );

    await web3.eth.sendSignedTransaction( serializedTransaction )
    .on( 'error' , function( error ) {
        console.error( error )
    })
	.on('confirmation', async (confirmationNumber: number, receipt) => { 
            console.log(confirmationNumber);
            console.log(receipt);
	})
	.on('receipt', async (txReceipt) => {
		console.log("signAndSendTx txReceipt. Tx Address: " + txReceipt.transactionHash);
	})

}
swapAssets().then((resolve)=>console.log("Script Complete")).catch((error)=>{
    console.log("Error",error);
    process.exitCode=1;
})


