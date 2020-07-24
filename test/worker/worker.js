importScripts('community-detection.js');

onmessage = function(e) {
    console.log('Worker: Message received from main script');
    console.log(e.data);

    Module.onRuntimeInitialized = async _ => {
        console.log('Module.onRuntimeInitialized');
        const api = {
            edgeBetweenness: Module.cwrap('edgeBetweenness', 'number', ['number', 'number', 'number']),
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
        function runCommunityDetection(algorithmName, n, edges) {
            const edgesPointer = api.createBuffer(edges.length);
            const uint8Edges = new Uint8Array(new Float64Array(edges).buffer);
            Module.HEAP8.set(uint8Edges, edgesPointer);

            api[algorithmName](n, edgesPointer, edges.length);

            const membership = getResultData(api.getMembershipPointer(), n);
            const modularity = getResultData(api.getModularityPointer(), api.getModularitySize());

            api.freeResult();
            api.destroyBuffer(edgesPointer);

            return {
                modularity,
                membership
            }
        }

        function getResultData(pointer, size) {
            const resultView = new Float64Array(Module.HEAP8.buffer, pointer, size); // move data from buffer to js
            return new Float64Array(resultView);
        }


        const { algo, n, edges } = e.data;

        const result = runCommunityDetection(algo, n, edges);
        postMessage(result);
    };
};
