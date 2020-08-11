# igraph-community.js library

Emscripting [igraph's](https://igraph.org/) community detection algorithms to make them run in JavaScript.
 
Also provides Clauset-Newman-Moore, Louvain and Girvan-Newman algorithms modifications when partial source communities (seeds) are known.

This repository is a fork of `git@github.com:vtraag/igraph.git` on branch `fix/vector_binsearch` (version 0.9.0-pre)

# Installation

```
npm install --save git+https://github.com/rthrs/igraph-community.js.git
```

# Usage

This library could be run in any JS environment and provides both asm.js and Wasm build modules. It could also be run in a separate Web Worker.

Graph are represented as a pair - number denoting and edges array. Vertices ids are numbers from 0 to n, and first two numbers in the array represents first edge and so forth. 

For seed communities algorithms, membership of vertices to specific communities is available as parameter. Array index denotes vertex id and value is a id of community the vertex belongs to. 

## Node.js
```js
const igraphCommunity = require('igraph-community');

const graph = {
    n: 4,
    edges: [0,  1,  0,  2,  0,  3]
};

igraphCommunity.getAPI().then((api) => {
    const { runCommunityDetection } = api;

    const algorithmName = 'fastGreedy';
    const { modularity, membership } = runCommunityDetection(algorithmName, graph.n, graph.edges);
    console.log(membership, modularity);
});
```

## HTML

See example from `test/html` directory for reference  (but first copy files from `dist/wasm` or `dist/asm` to your directory).

## Web Worker

See example form `test/worker` directory for reference.

# API

Interface includes 9 community detection algorithms from igraph and 3 modifications of them handling seed communities.

Analysis of undirected and unweighted graph is available only so far. Currently, also no additional arguments passing (as in the igraph's documentation) is possible. Check igraph documentation for algorithms reference.

To get API access it is necessary to invoke `getAPI` function first, which returns Promise containing API object.

```js
const igraphCommunity = require('igraph-community');

igraphCommunity.getAPI().then((api) => {
    const { runCommunityDetection } = api;

    // do your stuff here...
});
``` 

### runCommunityDetection

```flow js
type runCommunityDetection = (
    name: AlgorithmNameType | SeedsAlgorithmNameType,
    n: number,
    edges: Array<number>,
    options?: {
        seedMembership?: Array<number>,
        progressHandler?: (percent: number) => void
    }
) => {|
    membership: Array<number>,       // membership array for highest modularity partition found
    modularity: number,              // modularity measure of returned membership
    modularitiesFound: Array<number> // modularities array for partitions found during the algorithm
|};
```

```js
type AlgorithmNameType = 
      'edgeBetweenness'
    | 'fastGreedy'
    | 'infomap'
    | 'labelPropagation'
    | 'leadingEigenvector'
    | 'louvain'
    | 'leiden'
    | 'optimal'
    | 'spinglass'
    | 'walktrap';
```

```js
type SeedsAlgorithmNameType = 
      'louvainSeed'      
    | 'fastGreedySeed'
    | 'edgeBetweennessSeed';
```

Lists of algorithms name is also available in constants: `{ IGRAPH_ALGORITHM_NAMES, SEED_ALGORITHM_NAMES, ALL_ALGORITHM_NAMES } = require('igraph-community')`;

When using algorithms of `SeedsAlgorithmNameType`` for partially known communities you should pass `seedMembership` option.

```js
const igraphCommunity = require('igraph-community');

const graph = {
    n: 4,
    edges: [0,  1,  0,  2,  0,  3]
};

const seedMembership = [-1, 0, 0, -1];

igraphCommunity.getAPI().then((api) => {
    const { runCommunityDetection } = api;
    runCommunityDetection('louvainSeed', graph.n, graph.edges, { seedMembership });
});
```

# Handling evaluation progress

```js
const progressHandler = (percent) => {
    console.log(percent);
}

runCommunityDetection('fastGreedy', n, edges, { progressHandler });
```

Remark: only several algorithms provide progress handling. 

# Manual build of the project

```
./buid.sh
```

The command will build Wasm module in development mode providing `-g4` debug information. Other available options are:

```
-p, --production
    build with -03 optimization, disables debug mode
-a, --asm
    build ams.js module instead of Wasm
```

To enable `emcc` debug information itself try for example:

```
EMCC_DEBUG=1 ./build.sh --asm
```
