const Module = require('../dist/wasm/community-detection.js');
const R = require('ramda');
const cliProgress = require('cli-progress');
const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

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

    let modularity, membership;

    const zachary = [
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

    // const n = 4;
    // const edges = [0, 1, 1, 2, 2, 3];

    const n = 34;
    const edges = zachary;

    const johnAFaction = [ // administratorCommunity
        8, 9,
        14, 15,
        18,
        20,
        22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33
    ]; // 18 nodes


    const mrHiFaction = [ // instructorCommunity
        0,1,2,3,4,5,6,7,
        10,11,12,13,
        16, 17,
        19,
        21
    ]; // 16 nodes

    const emptyComms = [[]];

    function powerSet(array) {
        const result = [[]];

        for (let value of array) {
            const length = result.length;
            for (let i = 0; i < length; i++){
                let temp = result[i].slice(0);
                temp.push(value);
                result.push(temp);
            }
        }

        return result.sort((a, b) => {
            // FIXME
            // if (a.length === b.length) {
            //     if (R.lt(a, b)) {
            //         return -1;
            //     }
            //     if (R.gt(a, b)) {
            //         return 1;
            //     }
            //     return 0;
            // }
            return a.length - b.length;
        });
    }

    function runBenchmark() {
        console.log('GEN mrHi powerset');
        const mrHiPowerSet = powerSet(mrHiFaction);
        console.log(mrHiPowerSet)
        console.log('GEN johnA powerset');
        const johnPowerSet = powerSet(johnAFaction);
        console.log(johnPowerSet);

        console.log('BENCHMARK ON MR HI SEEDS POWERSET:');
        const res1 = runGNonSeeds(mrHiPowerSet, emptyComms);
        console.log('***********************************');
        console.log(res1);

        // console.log('BENCHMARK ON JOHN A SEEDS POWERSET:');
        // runGNonSeeds(emptyComms, johnPowerSet);
    }

    function runGNonSeeds(mrHiComms, johnComms) {
        let bestModularity = -1;
        let bestMembership = null;
        let bestSeeds = {
            john: [],
            mrHi: []
        };

        const steps = mrHiComms.length * johnComms.length;
        bar.start(steps, 0);
        let c = 0;
        for (let i = 0; i < mrHiComms.length; i++) {
            for (let j = 0; j < johnComms.length; j++) {
                bar.update(c++);

                const mrHiSeed = mrHiComms[i];
                const johnSeed = johnComms[j];

                console.log(`${c++}/${steps}`);
                // console.log(`${c++}/${steps}`, mrHiSeed, johnSeed);

                const seedMembership = makeMembership(mrHiSeed, johnSeed);
                console.log(mrHiSeed, johnSeed);
                const { modularity, membership } = runCommunityDetection('edgeBetweennessMod2', n, edges, seedMembership);
                // console.log({ modularity, membership })
                const q = R.reduce(R.max, -Infinity, modularity);
                if (q > bestModularity) {
                    bestMembership = membership;
                    bestSeeds = {
                        john: johnSeed,
                        mrHi: mrHiSeed
                    };
                    bestModularity = q;
                    console.log('\nFOUND BETTER!', bestModularity, bestSeeds);
                }
            }
        }
        bar.stop();
        return {
            bestSeeds,
            bestMembership,
            bestModularity
        }
    }

    let membershipSeedTmp = new Array(n);
    function makeMembership(mrHiComms= [], johnComms = []) {
        const membership = membershipSeedTmp.fill(-1);
        R.forEach((idx) => {
            membership[idx] = 0;
        }, mrHiComms);

        R.forEach((idx) => {
            membership[idx] = 1;
        }, johnComms);

        return membership;
    }

    runBenchmark();
};