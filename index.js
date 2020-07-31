const IGRAPH_ALGORITHM_NAMES = [
    'edgeBetweenness',
    'fastGreedy',
    'infomap',
    'labelPropagation',
    'leadingEigenvector',
    'louvain',
    'leiden',
    'optimal',
    'spinglass',
    'walktrap'
];

const SEED_ALGORITHM_NAMES = [
    'fastGreedySeed',
    'louvainSeed',
    'edgeBetweennessSeed'
];

const ALL_ALGORITHM_NAMES = [
    ...IGRAPH_ALGORITHM_NAMES,
    ...SEED_ALGORITHM_NAMES
];

let publicAPI = null;

const getAPI = ({ wasm = true, onLoad = () => {} } = {}) =>
    new Promise(((resolve, reject) => {
        if (publicAPI) {
            resolve(publicAPI);
            onLoad(publicAPI)
        } else {
            loadPublicAPI((api) => {
                publicAPI = api;
                resolve(api);
                onLoad(api)
            }, wasm)
        }
    }));

function loadPublicAPI(onLoaded, wasm) {
    const Module = wasm ? require('./dist/wasm/community-detection.js') : require('./dist/asm/community-detection.js');

    Module.onRuntimeInitialized = () => {
        const api = {
            // Main algorithms
            edgeBetweenness: Module.cwrap('edgeBetweenness', 'number', ['number', 'number', 'number']),
            fastGreedy: Module.cwrap('fastGreedy', 'number', ['number', 'number', 'number']),
            infomap: Module.cwrap('infomap', 'number', ['number', 'number', 'number']),
            labelPropagation: Module.cwrap('labelPropagation', 'number', ['number', 'number', 'number']),
            leadingEigenvector: Module.cwrap('leadingEigenvector', 'number', ['number', 'number', 'number']),
            louvain: Module.cwrap('louvain', 'number', ['number', 'number', 'number']),
            leiden: Module.cwrap('leiden', 'number', ['number', 'number', 'number']),
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
            getMembershipModularity: Module.cwrap('getMembershipModularity', 'number', []),
            getModularitiesFoundPointer: Module.cwrap('getModularitiesFoundPointer', 'number', []),
            getModularitiesFoundSize: Module.cwrap('getModularitiesFoundSize', 'number', []),

            freeResult: Module.cwrap('freeResult', '', [])
        };

        // @edges: undirected edges list, the first two elements are the first edge, etc.
        function runCommunityDetection(algorithmName, n, edges, options = {}) {
            if (!ALL_ALGORITHM_NAMES.includes(algorithmName)) {
                throw new Error(`Uknown algorithm name: '${algorithmName}'. Possible options are:  ${ALL_ALGORITHM_NAMES}`);
            }

            const { seedMembership = null, progressHandler = null } = options;

            if (SEED_ALGORITHM_NAMES.includes(algorithmName) && !seedMembership) {
                throw new Error(`Option 'seedMembership' required`);
            }

            if (progressHandler) {
                console.__IGRAPH_COMMUNITY__PROGRESS_HANDLER = progressHandler;
            }

            const edgesPointer = api.createBuffer(edges.length);
            const uint8Edges = new Uint8Array(new Float64Array(edges).buffer);
            Module.HEAP8.set(uint8Edges, edgesPointer);

            const args = [n, edgesPointer, edges.length];
            let seedMembershipPointer;
            if (seedMembership) {
                seedMembershipPointer = api.createBuffer(seedMembership.length);
                const reindexedSeeds = reindexSeedMembership(seedMembership);
                const uint8SeedMembership = new Uint8Array(reindexedSeeds.buffer);
                Module.HEAP8.set(uint8SeedMembership, seedMembershipPointer);

                args.push(seedMembershipPointer);
            }
            api[algorithmName](...args);

            const membership = getResultData(api.getMembershipPointer(), n);
            const modularity = api.getMembershipModularity();
            const modularitiesFound = getResultData(api.getModularitiesFoundPointer(), api.getModularitiesFoundSize());

            api.freeResult();
            api.destroyBuffer(edgesPointer);
            if (seedMembershipPointer) {
                api.destroyBuffer(seedMembershipPointer);
            }

            return {
                membership,
                modularity,
                modularitiesFound
            };
        }

        function getResultData(pointer, size) {
            const resultView = new Float64Array(Module.HEAP8.buffer, pointer, size); // move data from buffer to js
            return new Float64Array(resultView);
        }

        function reindexSeedMembership(seedMembership) {
            const n = seedMembership.length;
            const newSeedMembership = new Float64Array(n);
            const idxs = {};
            let actFreeId = 0;

            for (let i = 0; i < n; i++) {
                const communityId = seedMembership[i];

                if (communityId < 0) {
                    newSeedMembership[i] = -1;
                    continue;
                }

                if (idxs[communityId] !== undefined) {
                    newSeedMembership[i] = idxs[communityId];
                } else {
                    idxs[communityId] = actFreeId;
                    newSeedMembership[i] = actFreeId;
                    actFreeId++;
                }
            }

            return newSeedMembership;
        }

        onLoaded({
            runCommunityDetection
        });
    };
}

module.exports = {
    getAPI,
    IGRAPH_ALGORITHM_NAMES,
    SEED_ALGORITHM_NAMES,
    ALL_ALGORITHM_NAMES
};
