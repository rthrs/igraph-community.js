
# igraph-community.js Library

This project provides Emscripten-compiled versions of [igraph's](https://igraph.org/) community detection algorithms, making them usable in JavaScript environments.

It also includes modified versions of the Clauset-Newman-Moore, Louvain, and Girvan-Newman algorithms that support partial input through known source communities (seeds).

> This repository is a fork of `git@github.com:vtraag/igraph.git`, branch `fix/vector_binsearch` (version 0.9.0-pre).

---

## Installation

```bash
npm install --save git+https://github.com/rthrs/igraph-community.js.git
```

---

## Usage

This library runs in any JavaScript environment and provides both `asm.js` and `WebAssembly` (Wasm) modules. It can also be executed inside a Web Worker.

Graphs are represented as an object with:
- `n`: number of vertices
- `edges`: a flat array of numbers representing edges. Each pair of numbers defines an edge (e.g., `[0, 1, 0, 2]` represents edges 0–1 and 0–2).

For seed-based algorithms, you can pass an array representing initial community memberships:
- Each index corresponds to a vertex ID
- Values indicate the community ID (or -1 if unknown)

### Node.js Example

```js
const igraphCommunity = require('igraph-community');

const graph = {
    n: 4,
    edges: [0, 1, 0, 2, 0, 3]
};

igraphCommunity.getAPI().then((api) => {
    const { runCommunityDetection } = api;

    const algorithm = 'fastGreedy';
    const { membership, modularity } = runCommunityDetection(algorithm, graph.n, graph.edges);
    console.log(membership, modularity);
});
```

### HTML Example

See the example in the `test/html` directory.  
Make sure to copy the appropriate files from `dist/wasm` or `dist/asm` to your working directory.

### Web Worker Example

Refer to the example in the `test/worker` directory.

---

## API

The API includes:
- 10 standard igraph community detection algorithms
- 3 modified versions that support seed communities
- Tools for comparing community membership vectors using RI, ARI, and NMI metrics

> Currently, only undirected and unweighted graphs are supported.  
> Algorithm-specific arguments (as in igraph's native API) are not yet implemented.  
> Please refer to the official igraph documentation for algorithm references.

To use the API, you must first call `getAPI()`, which returns a Promise resolving to the API object.

```js
igraphCommunity.getAPI().then((api) => {
    const { runCommunityDetection, compareCommunities } = api;

    // Your code here...
});
```

---

### `runCommunityDetection`

```ts
type runCommunityDetection = (
    name: AlgorithmNameType | SeedsAlgorithmNameType,
    n: number,
    edges: number[],
    options?: {
        seedMembership?: number[],
        progressHandler?: (percent: number) => void
    }
) => {
    membership: number[],
    modularity: number,
    modularitiesFound: number[]
};
```

#### Available Algorithms

```ts
type AlgorithmNameType =
    | 'edgeBetweenness'
    | 'fastGreedy'
    | 'infomap'
    | 'labelPropagation'
    | 'leadingEigenvector'
    | 'louvain'
    | 'leiden'
    | 'optimal'
    | 'spinglass'
    | 'walktrap';

type SeedsAlgorithmNameType =
    | 'louvainSeed'
    | 'fastGreedySeed'
    | 'edgeBetweennessSeed';
```

You can also import the algorithm name constants:

```js
const { IGRAPH_ALGORITHM_NAMES, SEED_ALGORITHM_NAMES, ALL_ALGORITHM_NAMES } = require('igraph-community');
```

#### Example with Seed Communities

```js
const igraphCommunity = require('igraph-community');

const graph = {
    n: 4,
    edges: [0, 1, 0, 2, 0, 3]
};

const seedMembership = [-1, 0, 0, -1];

igraphCommunity.getAPI().then((api) => {
    const { runCommunityDetection } = api;
    runCommunityDetection('louvainSeed', graph.n, graph.edges, { seedMembership });
});
```

---

### `compareCommunities`

```ts
type compareCommunities = (
    method: CompareCommunitiesMethods,
    membership1: number[],
    membership2: number[]
) => number;

type CompareCommunitiesMethods = 'RI' | 'ARI' | 'NMI';
```

#### Example

```js
const igraphCommunity = require('igraph-community');
const { COMPARE_COMMUNITIES_METHODS } = igraphCommunity;

const groundTruthMembership = [...];

igraphCommunity.getAPI().then((api) => {
    const { runCommunityDetection, compareCommunities } = api;

    const { membership } = runCommunityDetection('louvain', graph.n, graph.edges);

    const score = compareCommunities(COMPARE_COMMUNITIES_METHODS.NMI, groundTruthMembership, membership);
    console.log('NMI Score:', score);
});
```

---

## Progress Reporting

Some algorithms support progress updates via a `progressHandler` callback:

```js
const progressHandler = (percent) => {
    console.log(`Progress: ${percent}%`);
};

runCommunityDetection('fastGreedy', n, edges, { progressHandler });
```

> **Note:** Not all algorithms emit progress updates.

---

## Manual Build

To build the project manually:

```bash
./build.sh
```

This will compile the Wasm module in development mode (`-g4` for debugging symbols).

### Build Options

```
-p, --production   Build with -O3 optimizations (no debug symbols)
-a, --asm          Build an asm.js module instead of WebAssembly
```

To enable `emcc` debug output, you can run:

```bash
EMCC_DEBUG=1 ./build.sh --asm
```
