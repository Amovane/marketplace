import { ChangeEvent, useState } from "react";
import { ethers } from "ethers";
import { create as ipfsHttpClient } from "ipfs-http-client";
import { useRouter } from "next/router";
import { useNFTMarketplaceContract } from "../hooks/useContract";
const client = ipfsHttpClient({ url: "https://ipfs.infura.io:5001/api/v0" });
import { marketplaceAddress } from "../../config";
import * as NFTMarketplaceJSON from "../../artifacts/contracts/marketplace.sol/NFTMarketplace.json";

export default function CreateItem() {
  const contract = useNFTMarketplaceContract(
    marketplaceAddress,
    NFTMarketplaceJSON.abi,
    true
  );
  const [fileUrl, setFileUrl] = useState("");
  const [formInput, updateFormInput] = useState({
    price: "",
    name: "",
    description: "",
  });
  const router = useRouter();

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    /* upload image to IPFS */
    const file = e.target.files![0];
    try {
      const added = await client.add(file, {
        progress: (prog) => console.log(`received: ${prog}`),
      });
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      setFileUrl(url);
    } catch (error) {
      console.log("Error uploading file: ", error);
    }
  }
  async function uploadToIPFS() {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return;
    /* first, upload metadata to IPFS */
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl,
    });

    try {
      const added = await client.add(data);
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      /* after metadata is uploaded to IPFS, return the URL to use it in the transaction */
      return url;
    } catch (error) {
      console.log("Error uploading file: ", error);
    }
  }

  async function listNFTForSale() {
    const url = await uploadToIPFS();
    // /* create the NFT */
    const price = ethers.utils.parseUnits(formInput.price, "ether");
    let listingPrice = await contract.getListingPrice();
    let transaction = await contract.createToken(url!, price, {
      value: listingPrice,
    });
    await transaction.wait();
    router.push("/");
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="Asset Name"
          className="mt-8 p-4 input input-bordered input-primary w-full"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 p-4 textarea textarea-primary input-lg w-full"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />
        <input
          placeholder="Asset Price in Eth"
          type="number"
          className="mt-2 p-4 input input-bordered input-primary w-full"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        <input type="file" name="Asset" className="my-4" onChange={onChange} />
        {fileUrl && <img className="rounded mt-4" width="350" src={fileUrl} />}
        <button
          onClick={listNFTForSale}
          className="btn btn-primary font-bold mt-4  text-white rounded p-4 shadow-lg"
        >
          Create NFT
        </button>
      </div>
    </div>
  );
}
