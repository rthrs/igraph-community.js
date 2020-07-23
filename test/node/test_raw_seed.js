const Module = require('../../dist/wasm/community-detection.js');

const ALGORITHMS = [
    'edgeBetweenness',
    'fastGreedy',
    'infomap',
    'labelPropagation',
    'leadingEigenvector',
    'louvain',
    'optimal',
    'spinglass',
    'walktrap'
];

const ALGORITHMS_SEEDS = [
    'fastGreedySeed',
    'louvainSeed',
    'edgeBetweennessSeed'
];

function printAlgorithmName(name) {
    console.log();
    console.log(name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toUpperCase());
}

Module.onRuntimeInitialized = async _ => {
    const api = {
        // Main algorithms
        edgeBetweenness: Module.cwrap('edgeBetweenness', 'number', ['number', 'number', 'number']),
        fastGreedy: Module.cwrap('fastGreedy', 'number', ['number', 'number', 'number']),
        infomap: Module.cwrap('infomap', 'number', ['number', 'number', 'number']),
        labelPropagation: Module.cwrap('labelPropagation', 'number', ['number', 'number', 'number']),
        leadingEigenvector: Module.cwrap('leadingEigenvector', 'number', ['number', 'number', 'number']),
        louvain: Module.cwrap('louvain', 'number', ['number', 'number', 'number']),
        optimal: Module.cwrap('optimal', 'number', ['number', 'number', 'number']),
        spinglass: Module.cwrap('spinglass', 'number', ['number', 'number', 'number']),
        walktrap: Module.cwrap('walktrap', 'number', ['number', 'number', 'number']),

        // Seed algorithms
        fastGreedySeed: Module.cwrap('fastGreedySeed', 'number', ['number', 'number', 'number', 'number']),
        louvainSeed: Module.cwrap('louvainSeed', 'number', ['number', 'number', 'number', 'number']),
        edgeBetweennessSeed: Module.cwrap('edgeBetweennessSeed', 'number', ['number', 'number', 'number', 'number']),

        // Helpers
        createBuffer: Module.cwrap('createBuffer', 'number', ['number']),
        create_buffer: Module.cwrap('create_buffer', 'number', ['number', 'number']),
        destroyBuffer: Module.cwrap('destroyBuffer', '', ['number']),

        getMembershipPointer: Module.cwrap('getMembershipPointer', 'number', []),
        getModularityPointer: Module.cwrap('getModularityPointer', 'number', []),
        getModularitySize: Module.cwrap('getModularitySize', 'number', []),

        freeResult: Module.cwrap('freeResult', '', []),
    };

    // @edges: undirected edges list, the first two elements are the first edge, etc.
    function runCommunityDetection(algorithmName, n, edges, seedMembership = null) {
        const edgesPointer = api.createBuffer(edges.length);
        const uint8Edges = new Uint8Array(new Float64Array(edges).buffer);
        Module.HEAP8.set(uint8Edges, edgesPointer);

        const args = [n, edgesPointer, edges.length];
        let seedMembershipPointer;
        if (seedMembership) {
            seedMembershipPointer = api.createBuffer(seedMembership.length);
            const uint8SeedMembership = new Uint8Array(new Float64Array(seedMembership).buffer);
            Module.HEAP8.set(uint8SeedMembership, seedMembershipPointer);

            args.push(seedMembershipPointer);
        }
        api[algorithmName](...args);

        const membership = getResultData(api.getMembershipPointer(), n);
        const modularity = getResultData(api.getModularityPointer(), api.getModularitySize());

        api.freeResult();
        api.destroyBuffer(edgesPointer);
        if (seedMembershipPointer) {
            api.destroyBuffer(seedMembershipPointer);
        }

        return {
            modularity,
            membership
        }
    }

    function getResultData(pointer, size) {
        const resultView = new Float64Array(Module.HEAP8.buffer, pointer, size); // move data from buffer to js
        return new Float64Array(resultView);
    }

    let modularity, membership;

    // ZKC
    const n = 34;
    const edges = [
        0,  1,  0,  2,  0,  3,  0,  4,  0,  5,
        0,  6,  0,  7,  0,  8,  0, 10,  0, 11,
        0, 12,  0, 13,  0, 17,  0, 19,  0, 21,
        0, 31,  1,  2,  1,  3,  1,  7,  1, 13,
        1, 17,  1, 19,  1, 21,  1, 30,  2,  3,
        2,  7,  2,  8,  2,  9,  2, 13,  2, 27,
        2, 28,  2, 32,  3,  7,  3, 12,  3, 13,
        4,  6,  4, 10,  5,  6,  5, 10,  5, 16,
        6, 16,  8, 30,  8, 32,  8, 33,  9, 33,
        13, 33, 14, 32, 14, 33, 15, 32, 15, 33,
        18, 32, 18, 33, 19, 33, 20, 32, 20, 33,
        22, 32, 22, 33, 23, 25, 23, 27, 23, 29,
        23, 32, 23, 33, 24, 25, 24, 27, 24, 31,
        25, 31, 26, 29, 26, 33, 27, 33, 28, 31,
        28, 33, 29, 32, 29, 33, 30, 32, 30, 33,
        31, 32, 31, 33, 32, 33,
    ];

    ALGORITHMS.forEach((name) => {
        printAlgorithmName(name);
        runCommunityDetection(name, n, edges);
    });

    // ALGORITHMS_SEEDS.forEach((name) => {
    //     printAlgorithmName(name);
    //     runCommunityDetection(name, n, edges);
    // });

    // console.log('\nEDGE BETWEENNESS');
    // runCommunityDetection('edgeBetweenness', n, edges);
    //
    //
    // console.log('\nEDGE BETWEENNESS MOD2 - SEED 1');
    // let seedMembership = new Array(n).fill(-1);
    // seedMembership[9] = seedMembership[33] = 0;

    ///////////////////////////////////////////////////////////


    // // seedMembership[1] = seedMembership[2] = 1;

    // seedMembership[2] = seedMembership[11] = 0;
    // seedMembership[11] = seedMembership[2] = 1;


    // seedMembership[32] = seedMembership[8] = 0;
    // seedMembership[0] = seedMembership[1] = seedMembership[2] = 0;
    // seedMembership[8] = seedMembership[9] = seedMembership[30] = seedMembership[33] = 1;

///////////////////////////////!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    // console.log(runCommunityDetection('edgeBetweennessMod2', n, edges, seedMembership));
    //
    //
    // console.log('\nEDGE BETWEENNESS MOD2 - SEED 2');
    // seedMembership = new Array(n).fill(-1);
    // seedMembership[33] = seedMembership[31] = 0;
    // seedMembership[0] = seedMembership[4] = 1;
    // runCommunityDetection('edgeBetweennessMod2', n, edges, seedMembership);

///////////////////////////////!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    // console.log('\nEDGE BETWEENNESS MOD2 - SEED 3');
    // seedMembership = new Array(n).fill(-1);
    // seedMembership[9] = seedMembership[33] = seedMembership[8] = seedMembership[29] = seedMembership[2] = 0;
    // runCommunityDetection('edgeBetweennessMod2', n, edges, seedMembership);
    //
    // console.log('\nEDGE BETWEENNESS MOD2 - SEED SANITY');
    // // FIXME - modularity 29.0.... CHECK!!!
    // seedMembership = [-1, -1, 0, -1, -1, -1, -1, -1, 0, 0, -1, -1, -1, -1, 0, 0, -1, -1, 0, -1, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // const r = runCommunityDetection('edgeBetweennessMod2', n, edges, seedMembership);

    // console.log('\nFAST GREEDY');
    // ({ modularity, membership } = runCommunityDetection('fastGreedy', n, edges));
    // console.log(modularity);
    // console.log(membership);
    //
    // console.log('\nINFOMAP');
    // ({ modularity, membership } = runCommunityDetection('infomap', n, edges));
    // console.log(modularity);
    // console.log(membership);
    //
    // console.log('\nLABEL PROPAGATION');
    // ({ modularity, membership } = runCommunityDetection('labelPropagation', n, edges));
    // console.log(modularity);
    // console.log(membership);
    //
    // console.log('\nLOUVAIN');
    // ({ modularity, membership } = runCommunityDetection('louvain', n, edges));
    // console.log(modularity);
    // console.log(membership);
};