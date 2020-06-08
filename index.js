let publicAPI = null;

const loadIgraphCommunityAPI = ({ wasm = false, onLoad = () => {} }) => new Promise(((resolve, reject) => {
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
    const distPrefix = wasm ? 'wasm' : 'asm';
    const Module = require(`./dist/${distPrefix}/community_detection.out.js`);

    Module.onRuntimeInitialized = async _ => {
        const api = {
            edgeBetweenness: Module.cwrap('edgeBetweenness', 'number', ['number', 'number', 'number']),
            edgeBetweennessMod2: Module.cwrap('edgeBetweennessMod2', 'number', ['number', 'number', 'number', 'number']),

            fastGreedy: Module.cwrap('fastGreedy', 'number', ['number', 'number', 'number']),
            infomap: Module.cwrap('infomap', 'number', ['number', 'number', 'number']),
            labelPropagation: Module.cwrap('labelPropagation', 'number', ['number', 'number', 'number']),
            louvain: Module.cwrap('louvain', 'number', ['number', 'number', 'number']),

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

        onLoaded({
            ...api,
            runCommunityDetection,
            getResultData
        });
    };
}

module.exports = loadIgraphCommunityAPI;
