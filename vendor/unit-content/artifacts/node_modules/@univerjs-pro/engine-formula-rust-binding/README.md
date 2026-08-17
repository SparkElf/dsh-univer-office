# univer-formula

Rust implementation of the Univer formula engine core.

## Architecture

```
univer-formula/
├── lexer         Tokenizes Excel-style formula strings
├── parser        Recursive-descent parser → AST
├── ast           AST node definitions
├── dependency    Dependency graph + topological sort + cycle detection
├── interpreter   AST evaluator
├── value_object  Type system (Number, String, Boolean, Null, Error, Array, Reference, Lambda)
├── functions     Extensible function registry
├── napi_binding  Node.js NAPI-RS bindings
└── wasm_binding  WASM bindings (Milestone 4)
```

## Build

### Node.js native addon (NAPI)

```bash
cd crates/univer-formula
napi build --platform --release
```

### Development check

```bash
cargo check --features napi
```

## Testing

```bash
cargo test --features napi
```

## Milestones

- Milestone 1: Infrastructure + basic arithmetic (`=1+1`)
- Milestone 2: Dependency graph + core functions (~30)
- Milestone 3: Performance tuning + production readiness (~80 functions)
- Milestone 4: Browser WASM support
