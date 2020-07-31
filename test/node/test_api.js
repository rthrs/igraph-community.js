const { ZKC } = require('../graphs');
const { printAlgorithmName } = require('../utils');
const { getAPI, IGRAPH_ALGORITHM_NAMES, SEED_ALGORITHM_NAMES } = require('../../index');

const progressHandler = (percent) => {
    console.log('PROGRESS handler test: ' + percent);
};

getAPI({ wasm: true }).then((api) => {
    const { runCommunityDetection } = api;
    const { n, edges } = ZKC;

    console.log('\n\n>>> Original algorithms');

    IGRAPH_ALGORITHM_NAMES.forEach((name) => {
        printAlgorithmName(name);
        const { modularity, membership } = runCommunityDetection(name, n, edges);
        console.log(`membership: [${membership}]`);
        console.log(`modularity: ${modularity}`);
    });

    const seedMembership = new Array(n).fill(-1);

    console.log('\n\n>>> Sanity checks (all seeds == -1)');

    [ 'fastGreedy', 'fastGreedySeed', 'louvain', 'louvainSeed','edgeBetweenness','edgeBetweennessSeed'].forEach((name) => {
        printAlgorithmName(name);
        const { modularity, membership } = runCommunityDetection(name, n, edges, { seedMembership });
        console.log(`membership: [${membership}]`);
        console.log(`modularity: ${modularity}`);
    });

    seedMembership[33] = seedMembership[31] = 0;
    seedMembership[0] = seedMembership[4] = 1;

    console.log('\n\n>>> Seeds [0, 1] [31, 33]');

    SEED_ALGORITHM_NAMES.forEach((name) => {
        printAlgorithmName(name);
        const { modularity, membership } = runCommunityDetection(name, n, edges, { seedMembership });
        console.log(`membership: [${membership}]`);
        console.log(`modularity: ${modularity}`);
    });

    console.log();
    runCommunityDetection('fastGreedy', n, edges, { progressHandler });
});
