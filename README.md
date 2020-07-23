# igraph-community.js library

Emscripting [igraph's](https://igraph.org/) community detection algorithms to make them run in JavaScript.
 
Also provides Clauset-Newman-Moore, Louvain and Girvan-Newman algorithms modifications when partial source communties (seeds) are known.

This repository is a fork of `git@github.com:vtraag/igraph.git` on branch `fix/vector_binsearch` (version 0.9.0-pre+6d3f7305)

# Usage

This library could be run in any JS environment and provides both asm.js and Wasm build modules. It could also be run in a separate Web Worker.

Graph are represented as a pair - number denoting and edges array. Vertices ids are numbers from 0 to n, and first two numbers in the array represents first edge and so forth. 

For seed communities algorithms, membership of vertices to specific communities is available as parameter. Array index denotes vertex id and value is a id of community the vertex belongs to. 

## Node.js
```js
const n = 4;
const edges = [0,  1,  0,  2,  0,  3];

const loadIgraphCommunityAPI = require('../../index'); // TODO

loadIgraphCommunityAPI({ wasm: false }).then((api) => {
    const { membership, modularity } = api.runCommunityDetection('edgeBetweenness', n, edges);
    console.log(modularity);
    console.log(membership);
});
```

## HTML
TODO

## Web Worker
TODO

# API

Interface includes 9 community detection algorithms from igraph and 3 modifications of them handling seed communities.

Analysis of undirected and unweighted graph is available only so far. Currently, also no additional arguments passing (as in the igraph's documentation) is possible. Check igraph documentation for algorithms reference.

# Handling evaluation progress

TODO. 

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
