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

const COMPARE_COMMUNITIES_METHODS = {
    NMI: 'NMI',
    RI: 'RI',
    ARI: 'ARI'
};

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
            // Main algorithms API
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

            // Seed algorithms API
            fastGreedySeed: Module.cwrap('fastGreedySeed', 'number', ['number', 'number', 'number', 'number']),
            louvainSeed: Module.cwrap('louvainSeed', 'number', ['number', 'number', 'number', 'number']),
            edgeBetweennessSeed: Module.cwrap('edgeBetweennessSeed', 'number', ['number', 'number', 'number', 'number']),

            // Compare communities API
            compareCommunitiesNMI: Module.cwrap('compareCommunitiesNMI', 'number', ['number', 'number', 'number']),
            compareCommunitiesRI: Module.cwrap('compareCommunitiesRI', 'number', ['number', 'number', 'number']),
            compareCommunitiesARI: Module.cwrap('compareCommunitiesARI', 'number', ['number', 'number', 'number']),

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

            const edgesPointer = allocateBuffer(edges);

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
            freeBuffer(edgesPointer);

            if (seedMembershipPointer) {
                api.destroyBuffer(seedMembershipPointer);
            }

            return {
                membership: Array.from(membership),
                modularity,
                modularitiesFound: Array.from(modularitiesFound)
            };
        }

        function allocateBuffer(array) {
            const pointer = api.createBuffer(array.length);
            const uint8Data = new Uint8Array(new Float64Array(array).buffer);
            Module.HEAP8.set(uint8Data, pointer);
            return pointer;
        }

        function freeBuffer(pointer) {
            api.destroyBuffer(pointer);
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

        function compareCommunities(method, membership1, membership2) {
            if (!COMPARE_COMMUNITIES_METHODS[method]) {
                throw new Error(`Unknown communities comparision method`);
            }

            if (membership1.length !== membership2.length) {
                throw new Error('compareCommunitiesNMI: membership array lengths have to be equal.')
            }

            const m1Pointer = allocateBuffer(membership1);
            const m2Pointer = allocateBuffer(membership2);

            const compare = api[`compareCommunities${method}`];
            const value = compare(m1Pointer, m2Pointer, membership1.length);

            freeBuffer(m1Pointer);
            freeBuffer(m2Pointer);

            return value;
        }

        onLoaded({
            runCommunityDetection,
            compareCommunities
        });
    };
}

module.exports = {
    getAPI,
    IGRAPH_ALGORITHM_NAMES,
    SEED_ALGORITHM_NAMES,
    ALL_ALGORITHM_NAMES,
    COMPARE_COMMUNITIES_METHODS
};
