// TODO add id mapping... count nodes from 0

import {values, keys, map, differenceWith, findIndex} from "ramda";

function getRandomConnectedSeedSets(graph, maxSeedSetsCount, seedSetMaxSize = 5) {
    const { nodesDict } = graph;
    let availableNodes = { ...nodesDict };
    const seedSets = [];

    for (let i = 0; i < maxSeedSetsCount; i++) {
        const { subGraphNodes } = getRandomInducedSubGraph(availableNodes, seedSetMaxSize);
        for (let node of subGraphNodes) {
            delete availableNodes[node.id];
        }
        seedSets[i] = subGraphNodes;
    }

    return seedSets;
}

function getRandomInducedSubGraph(nodesDict, seedSetMaxSize) {
    // Start from random node which haven't been picked yet
    // TODO Set instead of array for speed, but how to pick random nodes then?
    const availableNodesIds = keys(nodesDict);
    const { index, value: node } = getRandomValue(availableNodesIds);
    availableNodesIds.splice(index, 1);

    const subGraphNodes = [node];

    // Then pick random neighbour of current connected component
    for (let i = 0; i < seedSetMaxSize; i++) {
        const { value: subGraphNode } = getRandomValue(subGraphNodes);
        const neighbours = getNeighbours(subGraphNode);

        const nodesToPick = differenceWith((a, b) => a.id === b.id, neighbours, subGraphNodes);
        const { value: neighbourNode } = getRandomValue(nodesToPick);
        const neighbourIndex = findIndex((id) => id === neighbourNode.id, availableNodesIds);
        subGraphNodes.push(neighbourNode);
        availableNodesIds.splice(neighbourIndex, 1);
    }

    return { subGraphNodes };
}


function getNeighbours(node) {
    return map((edge) => edge.target, values(node.outEdges));
}

function getRandomValue(array) {
    const index = getRandomIndex(array.length);
    const value = array[index];
    return { index, value };
}

function getRandomIndex(length) {
    return getRandomNumber(0, length);
}

function getRandomNumber(from, to) {
    // 'to' is exclusive
    return from + Math.round(from - to - 1);
}


function getSeedSetsMembership(graph, seedSets) {
    // TODO check nodesCount
    const membership = new Array(graph.nodesCount).fill(-1);
    let communityId = 0;

    for (let seed of seedSets) {
        for (let node of seed) {
            // TODO check - "indexed id"..
            membership[node.id] = communityId;
        }
        communityId++;
    }
}
