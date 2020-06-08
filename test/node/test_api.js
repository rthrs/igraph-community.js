const loadIgraphCommunityAPI = require('../../index');

loadIgraphCommunityAPI({ wasm: false }).then((api) => {
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
    // const edges = [0, 1, 1, 2, 2, 3];
    const edges = zachary;
    // const n = 4;
    const n = 34;

    console.log('\nEDGE BETWEENNESS');
    ({ modularity, membership } = api.runCommunityDetection('edgeBetweenness', n, edges));
    console.log(modularity);
    console.log(membership);

    console.log('\nFAST GREEDY');
    ({ modularity, membership } = api.runCommunityDetection('fastGreedy', n, edges));
    console.log(modularity);
    console.log(membership);

    console.log('\nINFOMAP');
    ({ modularity, membership } = api.runCommunityDetection('infomap', n, edges));
    console.log(modularity);
    console.log(membership);

    console.log('\nLABEL PROPAGATION');
    ({ modularity, membership } = api.runCommunityDetection('labelPropagation', n, edges));
    console.log(modularity);
    console.log(membership);

    console.log('\nLOUVAIN');
    ({ modularity, membership } = api.runCommunityDetection('louvain', n, edges));
    console.log(modularity);
    console.log(membership);
});
