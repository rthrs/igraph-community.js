const { ZKC } = require('../graphs');
const { printAlgorithmName } = require('../utils');

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
    function runCommunityDetection(algorithmName, n, edges, options = {}) {
        const { seedMembership = null } = options;

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

    const { n, edges } = ZKC;

    ALGORITHMS.forEach((name) => {
        printAlgorithmName(name);
        const { modularity, membership } = runCommunityDetection(name, n, edges);
        console.log(`membership: [${membership}]`);
        console.log(`modularity: [${modularity}]`);
        console.log(`MAX modularity found: ${modularity.reduce((a, b) => Math.max(a,b), Number.MIN_VALUE)}`);
    });

    const seedMembership = new Array(n).fill(-1);
    seedMembership[33] = seedMembership[31] = 0;
    seedMembership[0] = seedMembership[4] = 1;


    // FIXME - modularity 29.0 for EB seeds
    // seedMembership = [-1, -1, 0, -1, -1, -1, -1, -1, 0, 0, -1, -1, -1, -1, 0, 0, -1, -1, 0, -1, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    ALGORITHMS_SEEDS.forEach((name) => {
        printAlgorithmName(name);
        const { modularity, membership } = runCommunityDetection(name, n, edges, { seedMembership });
        console.log(`modularity: [${modularity}]`);
        console.log(`membership: [${membership}]`);
    });
};
