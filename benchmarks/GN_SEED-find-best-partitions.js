const R = require('ramda');
const cliProgress = require('cli-progress');
const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const { ZKC } = require('../test/graphs');
const { getAPI } = require('../index');

getAPI().then((api) => {
    const { runCommunityDetection } = api;
    const { n, edges } = ZKC;
    const runGNSeedOnZKC = (seedMembership) => runCommunityDetection('edgeBetweennessSeed', n, edges, { seedMembership });
    runBenchmark(runGNSeedOnZKC, ZKC);
});

const JOHN_A_FACTION = [ // administratorCommunity
    8, 9,
    14, 15,
    18,
    20,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33
]; // 18 nodes


const MR_HI_FACTION = [ // instructorCommunity
    0,1,2,3,4,5,6,7,
    10,11,12,13,
    16, 17,
    19,
    21
]; // 16 nodes

const EMPTY_COMMUNITIES = [[]];

function runBenchmark(runGNSeedonGraph, graph) {
    console.log('GEN mrHi powerset');
    const mrHiPowerSet = powerSet(MR_HI_FACTION);
    console.log(mrHiPowerSet);
    console.log('GEN johnA powerset');
    const johnPowerSet = powerSet(JOHN_A_FACTION);
    console.log(johnPowerSet);

    console.log('BENCHMARK ON MR HI SEEDS POWERSET:');
    const res1 = runGNonSeeds(mrHiPowerSet, EMPTY_COMMUNITIES, runGNSeedonGraph, graph);
    console.log('***********************************');
    console.log(res1);

    console.log('BENCHMARK ON JOHN A SEEDS POWERSET:');
    const res2 = runGNonSeeds(EMPTY_COMMUNITIES, johnPowerSet, runGNSeedonGraph, graph);
    console.log('***********************************');
    console.log(res2);

    // console.log('BENCHMARK ON BOTH SEEDS POWERSETS:');
    // const res3 = runGNonSeeds(mrHiPowerSet, johnPowerSet, runGNSeedonGraph, graph);
    // console.log('***********************************');
    // console.log(res3);
}

function runGNonSeeds(mrHiComms, johnComms, runGNSeed, graph) {
    const makeMembership = makeMembershipFactory(graph.n);

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

            // console.log(`${c++}/${steps}`);
            // console.log(`${c++}/${steps}`, mrHiSeed, johnSeed);

            const seedMembership = makeMembership(mrHiSeed, johnSeed);
            // console.log(mrHiSeed, johnSeed);
            const { modularity, membership } = runGNSeed(seedMembership);
            // console.log({ modularity, membership })
            const q = modularity;
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

function makeMembershipFactory (n) {
    let membershipSeedTmp = new Array(n);

    return (mrHiComms= [], johnComms = []) => {
        const membership = membershipSeedTmp.fill(-1);
        R.forEach((idx) => {
            membership[idx] = 0;
        }, mrHiComms);

        R.forEach((idx) => {
            membership[idx] = 1;
        }, johnComms);

        return membership;
    }
}

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
