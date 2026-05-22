import { ethers } from "https://esm.sh/ethers@6.13.4";
import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.17.2";

const CONTRACT_ADDRESS = "PASTE_CONTRACT_ADDRESS_HERE";
const PROJECT_ID = "fe55ea601c3e7e0925c0b33723d6b158";
const ABI = [
 "function mint(uint256 amount) external payable",
 "function PRICE() view returns (uint256)",
 "function minted(address user) view returns (uint256)",
 "function totalSupply() view returns (uint256)",
 "function tokenURI(uint256 tokenId) view returns (string)"
];

const MAINNET_HEX="0x1", MAINNET_ID=1, MAX_SUPPLY=10000, DEFAULT_PRICE_ETH="0.00005";
let wcProvider, provider, signer, contract, account, cachedPriceWei, cachedAlreadyMinted=0n;
const $=id=>document.getElementById(id);
const walletEl=$("wallet"), statusEl=$("status"), amountInput=$("amountInput"), priceText=$("priceText"), mintedText=$("mintedText"), progressBar=$("progressBar"), gallery=$("galleryGrid"), modal=$("walletModal");

function status(x){statusEl.textContent=x}
function openModal(){modal.classList.remove("hidden")}
function closeModal(){modal.classList.add("hidden")}
function ipfsToHttp(u){return u&&u.startsWith("ipfs://")?"https://ipfs.io/ipfs/"+u.replace("ipfs://",""):u}
function amount(){let a=Number(amountInput.value); if(!a||a<1)a=1; if(a>100)a=100; amountInput.value=a; return a}
function links(){if(CONTRACT_ADDRESS!=="PASTE_CONTRACT_ADDRESS_HERE"){ $("etherscanLink").href=`https://etherscan.io/address/${CONTRACT_ADDRESS}`; $("openseaLink").href=`https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}`}}

async function setup(p, acc){
 provider=new ethers.BrowserProvider(p); signer=await provider.getSigner(); account=acc||await signer.getAddress(); contract=new ethers.Contract(CONTRACT_ADDRESS,ABI,signer);
 walletEl.textContent=account.slice(0,6)+"..."+account.slice(-4); status("Connected"); closeModal(); links(); await progress(); await price();
}
async function browserWallet(){
 try{
  if(CONTRACT_ADDRESS==="PASTE_CONTRACT_ADDRESS_HERE") throw new Error("Встав адресу контракту в app.js");
  if(!window.ethereum) throw new Error("Wallet extension not found");
  if(await window.ethereum.request({method:"eth_chainId"})!==MAINNET_HEX) await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:MAINNET_HEX}]});
  const acc=await window.ethereum.request({method:"eth_requestAccounts"}); await setup(window.ethereum,acc[0]);
 }catch(e){status("Error: "+(e.shortMessage||e.message))}
}
async function walletConnect(){
 try{
  wcProvider=await EthereumProvider.init({projectId:PROJECT_ID,chains:[MAINNET_ID],optionalChains:[MAINNET_ID],showQrModal:true});
  await wcProvider.connect(); await setup(wcProvider,(wcProvider.accounts||[])[0]);
 }catch(e){status("Error: "+(e.shortMessage||e.message))}
}
async function disconnect(){try{if(wcProvider)await wcProvider.disconnect()}catch(e){} provider=signer=contract=account=null; walletEl.textContent="not connected"; status("Disconnected"); await price()}
async function price(){
 const a=BigInt(amount());
 if(contract&&account){cachedAlreadyMinted=await contract.minted(account); cachedPriceWei=await contract.PRICE()}
 if(!cachedPriceWei){priceText.textContent=a===1n?"FREE":(Number(a-1n)*Number(DEFAULT_PRICE_ETH)).toFixed(5).replace(/0+$/,'').replace(/\.$/,'')+" ETH";return}
 let paid=a; if(cachedAlreadyMinted===0n) paid=paid>0n?paid-1n:0n;
 priceText.textContent=paid===0n?"FREE":ethers.formatEther(cachedPriceWei*paid)+" ETH";
}
async function progress(){if(!contract)return; const m=Number(await contract.totalSupply()); mintedText.textContent=m+" / "+MAX_SUPPLY; progressBar.style.width=Math.min(100,m/MAX_SUPPLY*100)+"%"}
async function mint(){
 try{if(!contract){status("Connect wallet first");return} const a=amount(), already=await contract.minted(account), p=await contract.PRICE(); let paid=BigInt(a); if(already===0n)paid=paid>0n?paid-1n:0n; const tx=await contract.mint(a,{value:p*paid}); status("Tx: "+tx.hash); await tx.wait(); status("Mint success"); await progress(); await price(); await loadGallery()}catch(e){status("Error: "+(e.shortMessage||e.message))}
}
async function loadGallery(){
 if(!contract){status("Connect wallet first");return}
 gallery.innerHTML="Loading...";
 const s=Number(await contract.totalSupply()); if(!s){gallery.innerHTML="No minted yet";return}
 const ids=[]; for(let i=s;i>=Math.max(1,s-19);i--)ids.push(i);
 const cards=await Promise.all(ids.map(async id=>{try{const uri=await contract.tokenURI(id); const meta=await(await fetch(ipfsToHttp(uri))).json(); return `<article class="nftCard"><img src="${meta.image}"><div>${meta.name||"VOID #"+id}<small>Token #${id}</small></div></article>`}catch(e){return `<article class="nftCard"><div>Token #${id}<small>loading...</small></div></article>`}}));
 gallery.innerHTML=cards.join("");
}
$("connectWalletBtn").onclick=openModal; $("closeModalBtn").onclick=closeModal; $("browserWalletBtn").onclick=browserWallet; $("walletConnectBtn").onclick=walletConnect; $("disconnectBtn").onclick=disconnect; $("mintBtn").onclick=mint; $("loadGalleryBtn").onclick=loadGallery; $("minusBtn").onclick=async()=>{amountInput.value=Math.max(1,amount()-1);await price()}; $("plusBtn").onclick=async()=>{amountInput.value=Math.min(100,amount()+1);await price()}; amountInput.oninput=price; price(); links();
