import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
// import Picture from "../components/Picture";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // presaleStarted keeps track of whether the presale has started or not
  const [presaleStarted, setPresaleStarted] = useState(false);
  // presaleEnded keeps track of whether the presale ended
  const [presaleEnded, setPresaleEnded] = useState(false);
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  // checks if the currently connected MetaMask wallet is the owner of the contract
  const [isOwner, setIsOwner] = useState(false);
  // tokenIdsMinted keeps track of the number of tokenIds that have been minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();


  const [theme, setTheme] = useState(true);


  function toggle() {
    setTheme(preValue => !preValue)
  }

  /**
   * presaleMint: Mint an NFT during the presale
   */
  const presaleMint = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      const signer = await getProviderOrSigner(true);
      // Create a new instance of the Contract with a Signer, which allows
      // update methods
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      // call the presaleMint from the contract, only whitelisted addresses would be able to mint
      const tx = await whitelistContract.presaleMint({
        // value signifies the cost of one crypto dev which is "0.01" eth.
        // We are parsing `0.01` string to ether using the utils library from ethers.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * publicMint: Mint an NFT after the presale
   */
  const publicMint = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      const signer = await getProviderOrSigner(true);
      // Create a new instance of the Contract with a Signer, which allows
      // update methods
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      // call the mint from the contract to mint the Crypto Dev
      const tx = await whitelistContract.mint({
        // value signifies the cost of one crypto dev which is "0.01" eth.
        // We are parsing `0.01` string to ether using the utils library from ethers.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  };

  /*
      connectWallet: Connects the MetaMask wallet
    */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * startPresale: starts the presale for the NFT Collection
   */
  const startPresale = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      const signer = await getProviderOrSigner(true);
      // Create a new instance of the Contract with a Signer, which allows
      // update methods
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      // call the startPresale from the contract
      const tx = await whitelistContract.startPresale();
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      // set the presale started to true
      await checkIfPresaleStarted();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * checkIfPresaleStarted: checks if the presale has started by quering the `presaleStarted`
   * variable in the contract
   */
  const checkIfPresaleStarted = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      // call the presaleStarted from the contract
      const _presaleStarted = await nftContract.presaleStarted();
      if (!_presaleStarted) {
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  /**
   * checkIfPresaleEnded: checks if the presale has ended by quering the `presaleEnded`
   * variable in the contract
   */
  const checkIfPresaleEnded = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // call the presaleEnded from the contract
      const _presaleEnded = await nftContract.presaleEnded();
      // _presaleEnded is a Big Number, so we are using the lt(less than function) instead of `<`
      // Date.now()/1000 returns the current time in seconds
      // We compare if the _presaleEnded timestamp is less than the current time
      // which means presale has ended
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }
      return hasEnded;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  /**
   * getOwner: calls the contract to retrieve the owner
   */
  const getOwner = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS, 
        abi, 
        provider
      );
      // call the owner function from the contract
      const _owner = await nftContract.owner();
      // We will get the signer now to extract the address of the currently connected MetaMask account
      const signer = await getProviderOrSigner(true);
      // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  /**
   * getTokenIdsMinted: gets the number of tokenIds that have been minted
   */
  const getTokenIdsMinted = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // call the tokenIds from the contract
      const _tokenIds = await nftContract.tokenIds();
      //_tokenIds is a `Big Number`. We need to convert the Big Number to a string
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      // Check if presale has started and ended
      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      // Set an interval which gets called every 5 seconds to check presale has ended
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);

      // set an interval to get the number of token Ids minted every 5 seconds
      setInterval(async function () {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  /*
      renderButton: Returns a button based on the state of the dapp
    */
  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // If connected user is the owner, and presale hasnt started yet, allow them to start the presale
    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    // If connected user is not the owner but presale hasn't started yet, tell them that
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasnt started!</div>
        </div>
      );
    }

    // If presale started, but hasn't ended yet, allow for minting during the presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a
            Crypto Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // If presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };
  

  function themeIcon() {
    if(theme === true) {
      return(
          <div className={styles.top}>
            <img src='./moon-outline.svg' className={styles.sunny}/>
          </div>
      )
    }else if (theme === false) {
      return (
        <div className={styles.top}>
            <img src='./light-mode.svg' className={styles.sunny}/>
        </div>
      )
    }
  }

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div onClick={toggle} className={styles.themeIcon}>
         {themeIcon()}
      </div>
      <div className={theme ? styles.main : styles.dark}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div>
            CryptoDevs is a collection of developers in the Web3 space
          </div>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted 🥳
          </div>
          {renderButton()}
        </div>
        <div>
          {/* <img className={styles.image} src="./cryptodevs/0.svg" /> */}
          <svg width="424" height="533" viewBox="0 0 424 533" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="undraw_ether_re_y7ft 1" clip-path="url(#clip0_2_41)">
            <path id="Vector" d="M86.3908 504.161C85.6507 504.195 84.918 504 84.2921 503.604C83.6661 503.208 83.1771 502.628 82.8913 501.945C82.6055 501.261 82.5367 500.507 82.6943 499.783C82.8518 499.059 83.2281 498.401 83.7721 497.898C83.8632 497.536 83.9286 497.276 84.0197 496.914C83.9871 496.835 83.9543 496.756 83.9213 496.677C83.1758 494.916 81.9264 493.415 80.3303 492.362C78.7341 491.308 76.8623 490.75 74.95 490.757C73.0376 490.764 71.17 491.336 69.5817 492.401C67.9934 493.467 66.7553 494.977 66.0228 496.744C63.0954 503.794 59.3684 510.857 58.4507 518.312C58.0465 521.607 58.217 524.947 58.9546 528.184C52.0789 513.186 48.5086 496.884 48.4856 480.385C48.4842 476.245 48.7142 472.108 49.1747 467.993C49.5552 464.62 50.0831 461.271 50.7584 457.946C54.4436 439.904 62.3559 422.994 73.8454 408.604C79.4063 405.57 83.9035 400.904 86.731 395.235C87.7553 393.198 88.4792 391.022 88.8803 388.777C88.253 388.859 87.6154 388.911 86.9881 388.952C86.7927 388.962 86.5871 388.972 86.3916 388.983L86.3179 388.986C85.6285 389.017 84.9448 388.848 84.3492 388.499C83.7536 388.151 83.2714 387.638 82.9608 387.021C82.6501 386.405 82.5242 385.712 82.5982 385.026C82.6722 384.34 82.9429 383.69 83.3778 383.154C83.6487 382.82 83.9197 382.487 84.1909 382.154C84.6023 381.64 85.0239 381.136 85.4352 380.622C85.4827 380.573 85.5273 380.522 85.5689 380.468C86.042 379.882 86.515 379.306 86.9881 378.719C86.1246 377.379 84.9632 376.257 83.5945 375.439C78.8536 372.662 72.3131 374.585 68.8886 378.874C65.4539 383.162 64.806 389.178 65.9988 394.536C67.172 399.095 69.1125 403.421 71.7373 407.329C71.4801 407.658 71.2127 407.977 70.9557 408.306C66.2559 414.349 62.1598 420.839 58.7259 427.681C59.561 420.015 58.5643 412.261 55.8179 405.056C53.0345 398.342 47.8173 392.686 43.2229 386.881C37.7044 379.909 26.3881 382.952 25.4158 391.791C25.4064 391.876 25.3972 391.962 25.3883 392.047C26.0707 392.432 26.7387 392.841 27.3923 393.273C28.2133 393.822 28.8495 394.606 29.2175 395.522C29.5855 396.438 29.6681 397.444 29.4545 398.408C29.2409 399.373 28.7411 400.25 28.0205 400.925C27.2999 401.6 26.3922 402.042 25.4162 402.192L25.3163 402.208C25.5594 404.667 25.9891 407.105 26.6018 409.499C28.3769 416.183 31.5138 422.429 35.8158 427.844C40.1177 433.259 45.492 437.727 51.6016 440.967C52.0027 441.173 52.3935 441.379 52.7946 441.574C49.3446 451.351 47.1806 461.535 46.3569 471.87C45.8906 477.967 45.9181 484.093 46.4392 490.185L46.4083 489.969C45.0919 483.194 41.4776 477.081 36.1759 472.662C28.3015 466.193 17.1765 463.811 8.68146 458.612C7.77864 458.032 6.72886 457.723 5.65598 457.72C4.5831 457.718 3.53187 458.022 2.62623 458.597C1.72059 459.172 0.998324 459.995 0.544654 460.967C0.0909839 461.939 -0.0751861 463.021 0.0657417 464.084C0.0771351 464.16 0.0887346 464.236 0.100501 464.311C1.36686 464.827 2.59986 465.421 3.79233 466.09C4.47475 466.475 5.14275 466.884 5.79633 467.316C6.61741 467.865 7.25362 468.649 7.62162 469.565C7.98962 470.481 8.07224 471.488 7.85865 472.452C7.64506 473.416 7.14522 474.293 6.42463 474.968C5.70403 475.643 4.79627 476.085 3.82032 476.235L3.72031 476.251C3.64831 476.261 3.58663 476.271 3.51475 476.282C5.6785 481.448 8.71541 486.204 12.4924 490.34C17.1583 495.346 22.7977 499.347 29.0648 502.097C35.3318 504.847 42.0945 506.288 48.9381 506.331H48.9485C50.8062 514.404 53.4979 522.262 56.9801 529.778H85.6718C85.7747 529.459 85.8672 529.13 85.9598 528.811C83.304 528.978 80.6378 528.819 78.0206 528.338C80.1494 525.726 82.2781 523.093 84.4069 520.481C84.4544 520.433 84.499 520.381 84.5406 520.327C85.6204 518.99 86.7104 517.664 87.7902 516.327L87.7908 516.325C87.8484 512.227 87.3781 508.139 86.3917 504.161L86.3908 504.161Z" fill="#F2F2F2"/>
            <path id="Vector_2" d="M337.486 504.161C338.226 504.195 338.958 504 339.584 503.604C340.21 503.208 340.699 502.628 340.985 501.945C341.271 501.261 341.34 500.507 341.182 499.783C341.024 499.059 340.648 498.401 340.104 497.898C340.013 497.536 339.948 497.276 339.857 496.914C339.889 496.835 339.922 496.756 339.955 496.677C340.701 494.916 341.95 493.415 343.546 492.362C345.142 491.308 347.014 490.75 348.926 490.757C350.839 490.764 352.706 491.336 354.295 492.401C355.883 493.467 357.121 494.977 357.853 496.744C360.781 503.794 364.508 510.857 365.426 518.312C365.83 521.607 365.659 524.947 364.922 528.184C371.797 513.186 375.368 496.884 375.391 480.385C375.392 476.245 375.162 472.108 374.702 467.993C374.321 464.62 373.793 461.271 373.118 457.946C369.433 439.904 361.52 422.994 350.031 408.604C344.47 405.57 339.973 400.904 337.145 395.235C336.121 393.198 335.397 391.022 334.996 388.777C335.623 388.859 336.261 388.911 336.888 388.952C337.084 388.962 337.289 388.972 337.485 388.983L337.558 388.986C338.248 389.017 338.931 388.848 339.527 388.499C340.123 388.151 340.605 387.638 340.915 387.021C341.226 386.405 341.352 385.712 341.278 385.026C341.204 384.34 340.933 383.69 340.498 383.154C340.228 382.82 339.957 382.487 339.685 382.154C339.274 381.64 338.852 381.136 338.441 380.622C338.394 380.573 338.349 380.522 338.307 380.468C337.834 379.882 337.361 379.306 336.888 378.719C337.752 377.379 338.913 376.257 340.282 375.439C345.023 372.662 351.563 374.585 354.988 378.874C358.422 383.162 359.07 389.178 357.877 394.536C356.704 399.095 354.764 403.421 352.139 407.329C352.396 407.658 352.664 407.977 352.921 408.306C357.62 414.349 361.717 420.839 365.15 427.681C364.315 420.015 365.312 412.261 368.058 405.056C370.842 398.342 376.059 392.686 380.653 386.881C386.172 379.909 397.488 382.952 398.461 391.791C398.47 391.876 398.479 391.962 398.488 392.047C397.806 392.432 397.138 392.841 396.484 393.273C395.663 393.822 395.027 394.606 394.659 395.522C394.291 396.438 394.208 397.444 394.422 398.408C394.635 399.373 395.135 400.25 395.856 400.925C396.576 401.6 397.484 402.042 398.46 402.192L398.56 402.208C398.317 404.667 397.887 407.105 397.275 409.499C395.499 416.183 392.363 422.429 388.061 427.844C383.759 433.259 378.384 437.727 372.275 440.967C371.874 441.173 371.483 441.379 371.082 441.574C374.532 451.351 376.696 461.535 377.519 471.87C377.986 477.967 377.958 484.093 377.437 490.185L377.468 489.969C378.784 483.194 382.399 477.081 387.7 472.662C395.575 466.193 406.7 463.811 415.195 458.612C416.098 458.032 417.147 457.723 418.22 457.72C419.293 457.718 420.345 458.022 421.25 458.597C422.156 459.172 422.878 459.995 423.332 460.967C423.785 461.939 423.952 463.021 423.811 464.084C423.799 464.16 423.788 464.236 423.776 464.311C422.509 464.827 421.276 465.421 420.084 466.09C419.402 466.475 418.734 466.884 418.08 467.316C417.259 467.865 416.623 468.649 416.255 469.565C415.887 470.481 415.804 471.488 416.018 472.452C416.231 473.416 416.731 474.293 417.452 474.968C418.172 475.643 419.08 476.085 420.056 476.235L420.156 476.251C420.228 476.261 420.29 476.271 420.362 476.282C418.198 481.448 415.161 486.204 411.384 490.34C406.718 495.346 401.079 499.347 394.812 502.097C388.544 504.847 381.782 506.288 374.938 506.331H374.928C373.07 514.404 370.378 522.262 366.896 529.778H338.204C338.102 529.459 338.009 529.13 337.916 528.811C340.572 528.978 343.238 528.819 345.856 528.338C343.727 525.726 341.598 523.093 339.469 520.481C339.422 520.433 339.377 520.381 339.336 520.327C338.256 518.99 337.166 517.664 336.086 516.327L336.085 516.325C336.028 512.227 336.498 508.139 337.485 504.161L337.486 504.161Z" fill="#F2F2F2"/>
            <g id="manLeg">
            <path id="Vector_3" d="M95.525 514.522L103.913 518.096L121.692 487.445L109.312 482.17L95.525 514.522Z" fill="#A0616A"/>
            <path id="Vector_4" d="M164.839 522.46L173.956 522.459L178.294 487.291L164.837 487.292L164.839 522.46Z" fill="#A0616A"/>
            <path id="Vector_5" d="M164.518 531.971L192.555 531.97V531.615C192.555 528.721 191.405 525.945 189.359 523.899C187.312 521.852 184.537 520.702 181.642 520.702H181.642L176.52 516.817L166.965 520.703L164.517 520.703L164.518 531.971Z" fill="#2F2E41"/>
            <path id="Vector_6" d="M90.4252 520.611L116.218 531.602L116.357 531.276C117.492 528.614 117.522 525.61 116.442 522.925C115.362 520.24 113.259 518.094 110.597 516.959L110.596 516.958L107.408 511.376L97.0941 511.205L94.8425 510.245L90.4252 520.611Z" fill="#2F2E41"/>
            <path id="Vector_7" d="M173.783 314.325L187.639 398.699L183.868 411.272L188.817 420.177L181.55 498.381L184.499 504.875L176.258 509.958H159.487L158.597 439.16L154.455 428.765V423.036L146.021 379.865L145.122 433.478L142.43 438.671L118.31 501.809H99.505L100.959 490.605C97.5902 488.899 106.018 483.913 106.828 480.225L104.059 473.995L106.828 462.226L113.206 429.497L106.689 390.691L109.023 365.713L107.808 357.169L107.9 354.405C107.9 354.405 111.115 353.165 108.045 350.07C103.795 325.979 109.023 320.75 109.023 320.75L129.948 308.504L173.783 314.325Z" fill="#2F2E41"/>
            </g>
            <path id="manbody" d="M175.028 316.141C175.068 316.426 175.038 316.717 174.941 316.988C174.844 317.258 174.683 317.502 174.472 317.697C174.261 317.893 174.006 318.034 173.728 318.11C173.451 318.185 173.159 318.193 172.878 318.132C162.928 315.982 121.868 321.141 108.268 335.002C108.011 335.267 107.678 335.446 107.315 335.515C106.952 335.584 106.577 335.54 106.24 335.388C105.903 335.236 105.622 334.984 105.433 334.666C105.245 334.348 105.16 333.98 105.188 333.611C105.428 330.631 109.758 317.152 109.758 317.152L111.078 308.752C111.108 308.556 111.108 308.357 111.078 308.162L109.868 301.212C109.803 300.848 109.628 300.513 109.368 300.252L108.958 299.842C108.622 299.504 108.433 299.048 108.433 298.572C108.433 298.095 108.622 297.639 108.958 297.302L110.548 295.722C110.741 295.524 110.887 295.286 110.975 295.025C111.063 294.763 111.092 294.485 111.058 294.212L108.948 278.612C108.938 278.582 108.938 278.542 108.928 278.512L99.6081 229.292C99.5359 228.903 99.5937 228.501 99.7727 228.149C99.9516 227.796 100.242 227.513 100.598 227.342L116.438 219.771C116.603 219.695 116.754 219.594 116.888 219.472L127.948 209.212C128.278 208.913 128.704 208.742 129.148 208.732L149.028 208.582C149.304 208.581 149.576 208.644 149.824 208.766C150.072 208.887 150.289 209.064 150.458 209.282L156.508 217.152C156.723 217.429 157.015 217.638 157.348 217.752L161.448 219.141L173.288 223.161L173.838 223.351C174.178 223.469 174.475 223.687 174.689 223.976C174.903 224.265 175.025 224.612 175.038 224.971C175.046 225.024 175.05 225.078 175.048 225.131L172.088 286.391C172.079 286.662 172.127 286.931 172.228 287.181L173.648 290.491C173.79 290.827 173.826 291.198 173.753 291.555C173.68 291.912 173.5 292.238 173.238 292.491C172.818 292.891 172.338 293.351 172.038 293.691C171.428 294.361 172.728 299.671 172.928 300.441C172.946 300.507 172.96 300.574 172.968 300.641L173.698 306.131C173.741 306.454 173.694 306.782 173.564 307.08C173.433 307.377 173.224 307.634 172.958 307.821C172.756 307.966 172.586 308.15 172.459 308.364C172.332 308.577 172.251 308.815 172.221 309.061C172.191 309.307 172.213 309.557 172.285 309.795C172.356 310.033 172.477 310.253 172.638 310.441L174.238 312.331C174.456 312.599 174.598 312.92 174.648 313.261L175.028 316.141Z" fill="#6C63FF"/>
            <g id="manRight">
            <path id="Vector_8" d="M202.841 309.89C202.934 308.8 202.786 307.704 202.409 306.678C202.032 305.652 201.434 304.721 200.658 303.95C199.882 303.18 198.947 302.589 197.918 302.22C196.889 301.85 195.792 301.711 194.703 301.811L183.723 277.609L176.365 289.296L187.92 310.487C188.21 312.304 189.156 313.953 190.58 315.119C192.004 316.286 193.806 316.889 195.646 316.816C197.485 316.742 199.233 315.996 200.559 314.72C201.886 313.443 202.697 311.725 202.841 309.89V309.89Z" fill="#A0616A"/>
            <path id="Vector_9" d="M187.958 284.481L187.348 285.621L180.918 297.641L180.018 299.321L173.738 290.671L153.128 262.291L156.058 244.491L161.448 222.191L169.438 221.731L175.038 224.021C177.423 225.075 179.38 226.908 180.586 229.22C181.793 231.532 182.178 234.185 181.678 236.744L176.718 262.141L187.958 284.481Z" fill="#6C63FF"/>
            </g>
            <g id="ManHead">
            <path id="ab6171fa-7d69-4734-b81c-8dff60f9761b" d="M140.038 203.208C150.534 203.208 159.042 194.7 159.042 184.204C159.042 173.709 150.534 165.2 140.038 165.2C129.542 165.2 121.034 173.709 121.034 184.204C121.034 194.7 129.542 203.208 140.038 203.208Z" fill="#A0616A"/>
            <path id="Vector_10" d="M156.583 167.104C156.299 165.526 155.663 164.031 154.723 162.731C154.249 162.169 153.662 161.712 153 161.391C152.338 161.071 151.616 160.893 150.88 160.871C150.145 160.849 149.413 160.982 148.733 161.262C148.052 161.541 147.439 161.962 146.932 162.495C147.229 161.631 147.315 160.709 147.184 159.805C145.796 160.47 144.311 160.912 142.785 161.113L146.157 157.592L129.37 159.134C127.638 159.293 125.764 159.519 124.492 160.835C123.22 162.151 123.149 164.96 124.757 165.694C121.589 164.501 117.95 166.233 115.86 169.135C113.769 172.037 112.999 175.865 112.858 179.578C112.675 184.393 113.572 189.52 116.512 193.065C118.434 195.383 121.054 196.829 123.181 198.914L123.245 198.977C125.575 201.367 128.495 203.097 131.71 203.992C134.924 204.888 138.319 204.917 141.548 204.076C141.911 203.976 142.271 203.865 142.633 203.762C144.442 204.58 146.695 203.462 147.837 201.643C149.054 199.703 149.295 197.221 149.346 194.856C149.414 191.764 149.223 188.672 148.777 185.611C148.273 182.165 147.82 177.751 150.549 176.02C152.674 174.673 155.314 176.003 157.454 177.322C157.659 173.892 157.366 170.45 156.583 167.104Z" fill="#2F2E41"/>
            </g>
            <g id="manLeft">
            <path id="Vector_11" d="M116.212 147.749C116.301 148.839 116.151 149.935 115.771 150.96C115.391 151.985 114.791 152.915 114.013 153.683C113.235 154.451 112.299 155.039 111.269 155.406C110.239 155.773 109.141 155.91 108.053 155.807L97.0106 179.98L89.6827 168.275L101.292 147.114C101.586 145.297 102.537 143.651 103.964 142.488C105.391 141.326 107.195 140.727 109.034 140.805C110.873 140.883 112.619 141.633 113.942 142.913C115.265 144.193 116.073 145.914 116.212 147.749V147.749Z" fill="#A0616A"/>
            <path id="Vector_12" d="M116.06 255.081L103.397 254.167L81.4198 227.26L65.1061 203.877L68.8633 194.371L86.622 168.929L86.4381 166.731L88.4034 166.377L88.4381 163.731L90.0692 163.991L94.4381 157.731L104.438 165.731L98.7827 182.345L98.4381 185.731L96.4816 189.104L97.4381 193.731L93.6985 197.28L91.8979 202.57C99.6659 207.678 107.033 215.321 114.215 224.887L116.06 255.081Z" fill="#6C63FF"/>
            </g>
            <g id="ladyBody">
            <path id="Vector_13" d="M288.635 284.344L287.262 297.074L288.07 313.768L251.094 309.375L247.619 284.344L252.046 284.387L288.635 284.344Z" fill="#FFB6B6"/>
            <path id="Vector_14" d="M256.439 242.504L265.226 237.233L269.438 230.732L282.438 232.732L298.33 243.384L298.174 267.545L288.321 292.604L247.025 287.333L245.456 278.494C245.456 278.494 234.034 263.152 246.335 254.366L256.439 242.504Z" fill="#6C63FF"/>
            </g>
            <g id="ladyLeft">
            <path id="Vector_15" d="M203.705 170.761C203.288 171.649 203.072 172.617 203.07 173.598C203.068 174.578 203.282 175.547 203.695 176.437C204.108 177.326 204.711 178.113 205.462 178.744C206.213 179.375 207.093 179.834 208.04 180.088L236.646 234.064L248.193 225.152L216.443 174.897C216.764 173.278 216.48 171.597 215.645 170.173C214.81 168.749 213.481 167.681 211.911 167.172C210.341 166.662 208.638 166.746 207.126 167.407C205.613 168.069 204.396 169.262 203.705 170.761V170.761Z" fill="#FFB6B6"/>
            <path id="Vector_16" d="M250.63 252.303C250.63 252.303 247.979 254.654 244.21 248.162C241.192 242.965 226.14 219.693 224.009 211.625C222.84 211.658 221.693 211.302 220.749 210.611C219.805 209.92 219.118 208.935 218.796 207.811L234.963 201.536C238.478 203.293 237.502 205.729 236.611 206.989L242.632 216.021L262.661 238.497L252.577 250.637L250.63 252.303Z" fill="#6C63FF"/>
            </g>
            <g id="LadyLeg">
            <path id="Vector_17" d="M307.814 515.476H299.73L295.882 484.294H307.814V515.476Z" fill="#FFB6B6"/>
            <path id="Vector_18" d="M312.081 529.483H306.283L305.248 524.009L302.598 529.483H287.222C286.485 529.483 285.767 529.247 285.173 528.81C284.579 528.373 284.141 527.758 283.922 527.055C283.702 526.351 283.714 525.596 283.954 524.899C284.194 524.202 284.651 523.6 285.258 523.182L297.537 514.701V509.168L310.452 509.939L312.081 529.483Z" fill="#2F2E41"/>
            <path id="Vector_19" d="M262.404 515.476H254.32L250.472 484.294H262.404V515.476Z" fill="#FFB6B6"/>
            <path id="Vector_20" d="M266.671 529.483H260.873L259.838 524.009L257.188 529.483H241.812C241.075 529.483 240.357 529.247 239.763 528.81C239.17 528.373 238.731 527.758 238.512 527.055C238.292 526.351 238.304 525.596 238.544 524.899C238.784 524.202 239.241 523.6 239.848 523.182L252.127 514.701V509.168L265.042 509.939L266.671 529.483Z" fill="#2F2E41"/>
            <path id="ladyLeg" d="M311.302 488.586H311.214L309.659 437.886C310.665 435.945 311.176 433.785 311.145 431.6C311.115 429.414 310.545 427.269 309.485 425.357L309.263 424.954L309.84 422.279C310.581 418.842 310.241 415.26 308.866 412.023L307.415 364.729C312.597 331.147 287.902 309.246 287.902 309.246H250.909L248.266 318.329L245.438 320.731L246.509 324.366L243.438 328.731L242.967 336.533C237.717 387.685 238.67 437.532 247.001 485.825L246.774 485.939C246.343 486.18 246.022 486.577 245.876 487.048C245.73 487.519 245.771 488.028 245.99 488.47C246.375 489.585 247.35 490.261 248.168 489.978L267.705 489.299C268.136 489.059 268.457 488.662 268.603 488.191C268.749 487.719 268.708 487.21 268.489 486.768C268.104 485.653 267.129 484.978 266.311 485.26L264.982 485.932L267.815 437.008L267.501 428.072L268.149 417.934L271.143 372.333L282.478 428.409L294.056 489.15C293.737 489.439 293.513 489.819 293.413 490.238C293.314 490.657 293.344 491.096 293.5 491.498C293.655 491.9 293.929 492.245 294.285 492.488C294.641 492.731 295.062 492.86 295.493 492.859H311.302C311.868 492.859 312.412 492.634 312.812 492.233C313.213 491.832 313.438 491.289 313.438 490.722C313.438 490.156 313.213 489.612 312.812 489.212C312.412 488.811 311.868 488.586 311.302 488.586V488.586Z" fill="#2F2E41"/>
            </g>
            <g id="ladyHand">
            <path id="Vector_21" d="M351.815 330.107C352.206 329.208 352.394 328.234 352.367 327.253C352.34 326.273 352.099 325.311 351.66 324.434C351.22 323.557 350.594 322.788 349.826 322.179C349.057 321.57 348.164 321.138 347.21 320.911L317.04 267.793L305.758 277.038L338.962 326.345C338.688 327.973 339.021 329.644 339.897 331.043C340.774 332.442 342.133 333.471 343.717 333.935C345.302 334.399 347.001 334.265 348.494 333.56C349.986 332.854 351.168 331.626 351.815 330.107V330.107Z" fill="#FFB6B6"/>
            <path id="Vector_22" d="M295.815 243.347C295.815 243.347 298.396 240.919 302.353 247.298C305.522 252.405 327.961 281.851 330.327 289.853C331.495 289.786 332.651 290.109 333.615 290.772C334.579 291.435 335.294 292.399 335.65 293.514L319.672 300.258C316.108 298.604 314.447 295.51 315.301 294.225L309.019 285.372L285.466 258.18L293.918 245.068L295.815 243.347Z" fill="#6C63FF"/>
            </g>
            <path id="Vector_23" d="M415.221 531.251C415.221 531.455 415.182 531.657 415.104 531.846C415.026 532.035 414.911 532.206 414.767 532.351C414.623 532.495 414.451 532.609 414.263 532.687C414.074 532.765 413.872 532.805 413.667 532.804H1.61722C1.20528 532.804 0.810206 532.641 0.518921 532.349C0.227636 532.058 0.0639954 531.663 0.0639954 531.251C0.0639954 530.839 0.227636 530.444 0.518921 530.153C0.810206 529.861 1.20528 529.698 1.61722 529.698H413.667C413.872 529.697 414.074 529.737 414.263 529.815C414.451 529.893 414.623 530.007 414.767 530.151C414.911 530.296 415.026 530.467 415.104 530.656C415.182 530.845 415.221 531.047 415.221 531.251V531.251Z" fill="#CCCCCC"/>
            <g id="ladyHead">
            <path id="Vector_24" d="M263.12 195.668C257.741 206.27 261.255 218.551 271.236 225.009C282.03 231.992 296.044 230.463 300.577 216.892C305.625 201.78 301.478 195.296 292.461 187.551C281.893 178.474 268.932 184.212 263.12 195.668Z" fill="#2F2E41"/>
            <path id="Vector_25" d="M289.599 219.286C286.86 222.874 282.81 225.227 278.337 225.83C273.864 226.433 269.335 225.236 265.744 222.502C262.153 219.768 259.794 215.72 259.186 211.248C258.578 206.776 259.769 202.245 262.499 198.651L262.647 198.457C265.436 194.965 269.487 192.71 273.924 192.177C278.362 191.645 282.831 192.878 286.367 195.611C289.903 198.344 292.224 202.358 292.828 206.786C293.431 211.215 292.27 215.703 289.595 219.283L289.599 219.286Z" fill="#FFB6B6"/>
            <path id="Vector_26" d="M257.907 193.951C260.675 196.585 264.048 198.496 267.73 199.517C268.468 198.663 269.343 197.938 270.319 197.372C269.852 198.344 269.532 199.38 269.369 200.446C271.011 203.853 277.718 206.303 284.127 208.808L292.617 193.825L281.38 187.458C272.35 181.215 261.721 183.879 257.907 193.951Z" fill="#2F2E41"/>
            <path id="Vector_27" d="M299.021 187.57C299.841 187.268 300.723 187.176 301.587 187.302C302.451 187.428 303.27 187.769 303.969 188.292C305.337 189.332 306.443 190.678 307.199 192.221C308.574 194.718 309.561 197.41 310.128 200.203C310.613 202.62 310.531 205.542 308.362 206.803C306.553 207.855 303.966 207.193 302.303 205.788C300.762 204.315 299.593 202.496 298.892 200.482C298.204 198.483 297.183 196.615 295.871 194.956L297.37 195.656C296.896 194.218 296.675 192.709 296.717 191.196C296.752 190.443 296.982 189.712 297.386 189.076C297.791 188.44 298.354 187.921 299.021 187.57V187.57Z" fill="#2F2E41"/>
            <path id="Vector_28" d="M279.585 189.533L291.641 196.365C293.255 197.279 294.673 198.503 295.815 199.966C296.956 201.428 297.798 203.102 298.292 204.89C298.787 206.678 298.925 208.546 298.697 210.387C298.47 212.228 297.882 214.007 296.968 215.621C294.277 220.369 289.913 223.943 284.728 225.644C279.542 227.346 273.909 227.053 268.928 224.823L279.945 215.098L265 222.712L261.809 220.904C277.837 217.99 280.929 205.418 279.585 189.533Z" fill="#2F2E41"/>
            </g>
            <g id="etherum">
            <path id="Vector_29" d="M163.162 0L123.5 66.033L163.297 89.529L163.162 0Z" fill="#8C8C8C"/>
            <path id="Vector_30" d="M202.998 66.033L163.162 0L163.297 89.529L202.998 66.033Z" fill="#333333"/>
            <path id="Vector_31" d="M123.5 66.033L163.249 47.916L163.297 89.529L123.5 66.033Z" fill="#383838"/>
            <path id="Vector_32" d="M202.998 66.033L163.249 47.916L163.335 88.008L202.998 66.033Z" fill="#141414"/>
            <path id="Vector_33" d="M202.901 73.595L163.2 97.091V129.5L202.901 73.595Z" fill="#333333"/>
            <path id="Vector_34" d="M123.498 73.595L163.2 97.091V129.5L123.498 73.595Z" fill="#8C8C8C"/>
            </g>
            </g>
            <defs>
            <clipPath id="clip0_2_41">
            <rect width="423.876" height="532.804" fill="white"/>
            </clipPath>
            </defs>
          </svg>

        </div>
      </div>

      <footer className={theme ? styles.footer : styles.footerDark}>
        Made with &#10084; Crypto Devs
      </footer>
    </div>
  );
}
