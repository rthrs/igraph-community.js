const { ZKC } = require('../graphs');
const { printAlgorithmName } = require('../utils');
const { getAPI, IGRAPH_ALGORITHM_NAMES, SEED_ALGORITHM_NAMES, COMPARE_COMMUNITIES_METHODS } = require('../../index');

const progressHandler = (percent) => {
    console.log('PROGRESS handler test: ' + percent);
};

getAPI({ wasm: true }).then((api) => {
    const { runCommunityDetection, compareCommunities } = api;
    const { n, edges, groundTruthMembership } = ZKC;
    const getCompareMeasures = (m1, m2) => ({
        nmi: compareCommunities(COMPARE_COMMUNITIES_METHODS.NMI, m1, m2),
        ri: compareCommunities(COMPARE_COMMUNITIES_METHODS.RI, m1, m2),
        ari: compareCommunities(COMPARE_COMMUNITIES_METHODS.ARI, m1, m2)
    });

    console.log('\n\n>>> Original algorithms');

    IGRAPH_ALGORITHM_NAMES.forEach((name) => {
        printAlgorithmName(name);
        const { modularity, membership } = runCommunityDetection(name, n, edges);
        const {nmi, ri, ari} = getCompareMeasures(groundTruthMembership, membership);
        console.log(`membership: [${membership}]`);
        console.log(`modularity: ${modularity}`);
        console.log(`NMI: ${nmi}; RI: ${ri}; ARI: ${ari}`);
    });

    const seedMembership = new Array(n).fill(-1);

    console.log('\n\n>>> Sanity checks (all seeds == -1)');

    [ 'fastGreedy', 'fastGreedySeed', 'louvain', 'louvainSeed','edgeBetweenness','edgeBetweennessSeed'].forEach((name) => {
        printAlgorithmName(name);
        const { modularity, membership } = runCommunityDetection(name, n, edges, { seedMembership });
        const {nmi, ri, ari} = getCompareMeasures(groundTruthMembership, membership);
        console.log(`membership: [${membership}]`);
        console.log(`modularity: ${modularity}`);
        console.log(`NMI: ${nmi}; RI: ${ri}; ARI: ${ari}`);
    });

    seedMembership[33] = seedMembership[31] = 0;
    seedMembership[0] = seedMembership[4] = 1;

    console.log('\n\n>>> Seeds [0, 1] [31, 33]');

    SEED_ALGORITHM_NAMES.forEach((name) => {
        printAlgorithmName(name);
        const { modularity, membership } = runCommunityDetection(name, n, edges, { seedMembership });
        const {nmi, ri, ari} = getCompareMeasures(groundTruthMembership, membership);
        console.log(`membership: [${membership}]`);
        console.log(`modularity: ${modularity}`);
        console.log(`NMI: ${nmi}; RI: ${ri}; ARI: ${ari}`);
    });

    console.log();
    runCommunityDetection('fastGreedy', n, edges, { progressHandler });
});
