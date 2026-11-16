---
title: "Scaffold: Orbital (Alkanes NFT)"
source: reference
source_url: https://github.com/kungfuflex/alkanes-rs/tree/main/crates/alkanes-std-orbital
---

# Scaffold: Orbital (Alkanes NFT)

A minimal Orbital is an Alkanes `Token` with total supply **1** plus opcode
**1000 (`GetData`)** returning the media. Starting template, modeled on the
canonical `alkanes-std-orbital`:

```rust
use alkanes_runtime::declare_alkane;
use alkanes_runtime::message::MessageDispatch;
use alkanes_runtime::{runtime::AlkaneResponder, storage::StoragePointer, token::Token};
use alkanes_support::{parcel::AlkaneTransfer, response::CallResponse};
use anyhow::Result;
use metashrew_support::index_pointer::KeyValuePointer;

#[derive(Default)]
pub struct MyOrbital(());

#[derive(MessageDispatch)]
enum OrbitalMessage {
    #[opcode(0)]
    Initialize,
    #[opcode(99)]
    #[returns(String)]
    GetName,
    #[opcode(100)]
    #[returns(String)]
    GetSymbol,
    #[opcode(101)]
    #[returns(u128)]
    GetTotalSupply,
    #[opcode(1000)]
    #[returns(Vec<u8>)]
    GetData,
}

impl Token for MyOrbital {
    fn name(&self) -> String { String::from("MyNFT") }
    fn symbol(&self) -> String { String::from("MYNFT") }
}

impl MyOrbital {
    fn total_supply_pointer(&self) -> StoragePointer { StoragePointer::from_keyword("/totalsupply") }
    fn total_supply(&self) -> u128 { self.total_supply_pointer().get_value::<u128>() }
    fn set_total_supply(&self, v: u128) { self.total_supply_pointer().set_value::<u128>(v); }

    fn data(&self) -> Vec<u8> {
        // Return your media bytes (PNG/SVG/...). Render on-chain or embed.
        b"<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>".to_vec()
    }

    fn initialize(&self) -> Result<CallResponse> {
        self.observe_initialization()?;
        let context = self.context()?;
        let mut response = CallResponse::forward(&context.incoming_alkanes);
        self.set_total_supply(1);
        response.alkanes.0.push(AlkaneTransfer { id: context.myself.clone(), value: 1u128 });
        Ok(response)
    }
    fn get_name(&self) -> Result<CallResponse> {
        let c = self.context()?;
        let mut r = CallResponse::forward(&c.incoming_alkanes);
        r.data = self.name().into_bytes().to_vec();
        Ok(r)
    }
    fn get_symbol(&self) -> Result<CallResponse> {
        let c = self.context()?;
        let mut r = CallResponse::forward(&c.incoming_alkanes);
        r.data = self.symbol().into_bytes().to_vec();
        Ok(r)
    }
    fn get_total_supply(&self) -> Result<CallResponse> {
        let c = self.context()?;
        let mut r = CallResponse::forward(&c.incoming_alkanes);
        r.data = (&self.total_supply().to_le_bytes()).to_vec();
        Ok(r)
    }
    fn get_data(&self) -> Result<CallResponse> {
        let c = self.context()?;
        let mut r = CallResponse::forward(&c.incoming_alkanes);
        r.data = self.data();
        Ok(r)
    }
}

impl AlkaneResponder for MyOrbital {}

declare_alkane! {
    impl AlkaneResponder for MyOrbital {
        type Message = OrbitalMessage;
    }
}
```

Build: `cargo build --target wasm32-unknown-unknown --release`
Deploy with `alkanes-cli` — see `subfrost/build/interacting-via-cli.md` and
`subfrost/api-reference/cli-sdk/alkanes.md` in the corpus.

Full reference: `alkafrost_doc reference/orbitals.md`. Canonical source:
`alkanes-rs/std-orbital.md`.

This is a starting template, not audited code — get it reviewed before mainnet.
